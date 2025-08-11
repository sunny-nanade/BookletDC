@echo off
title Booklet Scanner - GitHub Deployment Manager

REM Load configuration
if exist "deploy-config.bat" (
    call deploy-config.bat
) else (
    REM Default configuration if config file is missing
    set GITHUB_USER=your-username
    set GITHUB_REPO=BookletDC
    set GITHUB_BRANCH=main
    set REPO_URL=https://github.com/%GITHUB_USER%/%GITHUB_REPO%
    set ZIP_URL=%REPO_URL%/archive/refs/heads/%GITHUB_BRANCH%.zip
    set PROJECT_FOLDER=%GITHUB_REPO%
    set APP_NAME=Booklet Scanner
    set APP_VERSION=1.0
)

echo.
echo ================================================================
echo  %APP_NAME% - GitHub Deployment Manager v%APP_VERSION%
echo ================================================================
echo.
echo Repository: %REPO_URL%
echo Branch: %GITHUB_BRANCH%
echo Target: %CD%\%PROJECT_FOLDER%
echo.

REM Validate configuration
if "%GITHUB_USER%"=="your-username" (
    echo [ERROR] Configuration not updated!
    echo.
    echo Please edit 'deploy-config.bat' and set your GitHub username.
    echo Current setting: GITHUB_USER=%GITHUB_USER%
    echo.
    echo Instructions:
    echo 1. Open deploy-config.bat in a text editor
    echo 2. Change 'your-username' to your actual GitHub username
    echo 3. Save the file and run this script again
    echo.
    pause
    exit /b 1
)

echo [STEP 1/6] Checking system requirements...

REM Check PowerShell
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PowerShell not available
    echo This script requires PowerShell for downloading files.
    pause
    exit /b 1
)
echo [OK] PowerShell available

REM Check internet connectivity
echo [INFO] Testing internet connectivity...
ping github.com -n 1 >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Cannot reach GitHub - please check internet connection
    echo [INFO] Continuing anyway...
) else (
    echo [OK] Internet connectivity confirmed
)

echo.
echo [STEP 2/6] Analyzing existing installation...

if exist "%PROJECT_FOLDER%" (
    if exist "%PROJECT_FOLDER%\start.bat" (
        echo [FOUND] Valid %APP_NAME% installation detected
        
        REM Check if it's a Git repository
        if exist "%PROJECT_FOLDER%\.git" (
            echo [INFO] Git repository detected
            set INSTALL_TYPE=git-update
        ) else (
            echo [INFO] Standard installation detected
            set INSTALL_TYPE=zip-update
        )
        
        echo.
        echo What would you like to do?
        echo 1. Update to latest version (recommended)
        echo 2. Run existing installation without updating
        echo 3. Delete and reinstall fresh
        echo 4. Exit
        echo.
        set /p choice="Enter your choice (1-4): "
        
        if "%choice%"=="1" goto :update_installation
        if "%choice%"=="2" goto :run_existing
        if "%choice%"=="3" goto :fresh_install
        if "%choice%"=="4" exit /b 0
        
        echo [INFO] Invalid choice, defaulting to update...
        goto :update_installation
        
    ) else (
        echo [WARNING] Directory exists but doesn't contain %APP_NAME%
        echo [INFO] Will remove and reinstall
        rmdir /s /q "%PROJECT_FOLDER%" 2>nul
        goto :fresh_install
    )
) else (
    echo [INFO] No existing installation found
    goto :fresh_install
)

:fresh_install
echo.
echo [STEP 3/6] Installing %APP_NAME% from GitHub...
set INSTALL_TYPE=fresh
goto :download_project

:update_installation
echo.
echo [STEP 3/6] Updating %APP_NAME% from GitHub...

if "%INSTALL_TYPE%"=="git-update" (
    echo [INFO] Updating Git repository...
    cd /d "%PROJECT_FOLDER%"
    
    git fetch origin %GITHUB_BRANCH%
    if %errorlevel% neq 0 (
        echo [WARNING] Git update failed, falling back to ZIP download
        cd /d ..
        goto :zip_update
    )
    
    git reset --hard origin/%GITHUB_BRANCH%
    if %errorlevel% equ 0 (
        echo [OK] Git update successful
        goto :verify_installation
    ) else (
        echo [WARNING] Git reset failed, falling back to ZIP download
        cd /d ..
        goto :zip_update
    )
) else (
    goto :zip_update
)

:zip_update
echo [INFO] Updating via ZIP download...
if exist "%PROJECT_FOLDER%" (
    echo [INFO] Backing up existing installation...
    if exist "%PROJECT_FOLDER%-backup" rmdir /s /q "%PROJECT_FOLDER%-backup"
    move "%PROJECT_FOLDER%" "%PROJECT_FOLDER%-backup" >nul
)

:download_project
echo [INFO] Downloading from: %ZIP_URL%
echo [INFO] Please wait, this may take a few minutes...

REM Download with progress indication
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'Continue'; Write-Host '[INFO] Starting download...'; Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile 'temp-project.zip' -UseBasicParsing; Write-Host '[OK] Download completed'}"

if not exist "temp-project.zip" (
    echo [ERROR] Download failed
    echo.
    echo Possible causes:
    echo - Repository URL incorrect: %REPO_URL%
    echo - Repository is private or doesn't exist
    echo - Internet connection issues
    echo - GitHub is temporarily unavailable
    echo.
    
    REM Restore backup if updating
    if "%INSTALL_TYPE%"=="zip-update" (
        if exist "%PROJECT_FOLDER%-backup" (
            echo [INFO] Restoring backup installation...
            move "%PROJECT_FOLDER%-backup" "%PROJECT_FOLDER%" >nul
            echo [INFO] Backup restored, running existing version...
            goto :run_existing
        )
    )
    
    pause
    exit /b 1
)

echo.
echo [STEP 4/6] Extracting project files...

powershell -Command "Expand-Archive -Path 'temp-project.zip' -DestinationPath 'temp-extract' -Force"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to extract files
    del temp-project.zip 2>nul
    pause
    exit /b 1
)

REM Move extracted folder
set EXTRACTED_FOLDER=temp-extract\%GITHUB_REPO%-%GITHUB_BRANCH%
if exist "%EXTRACTED_FOLDER%" (
    move "%EXTRACTED_FOLDER%" "%PROJECT_FOLDER%" >nul
    if %errorlevel% equ 0 (
        echo [OK] Files extracted successfully
    ) else (
        echo [ERROR] Failed to move extracted files
        goto :cleanup_error
    )
) else (
    echo [ERROR] Extracted folder not found: %EXTRACTED_FOLDER%
    echo [ERROR] ZIP structure may be different than expected
    goto :cleanup_error
)

REM Cleanup
rmdir /s /q temp-extract 2>nul
del temp-project.zip 2>nul

REM Remove backup if update was successful
if "%INSTALL_TYPE%"=="zip-update" (
    if exist "%PROJECT_FOLDER%-backup" (
        rmdir /s /q "%PROJECT_FOLDER%-backup" 2>nul
        echo [INFO] Backup removed after successful update
    )
)

goto :verify_installation

:cleanup_error
rmdir /s /q temp-extract 2>nul
del temp-project.zip 2>nul

REM Restore backup if updating
if "%INSTALL_TYPE%"=="zip-update" (
    if exist "%PROJECT_FOLDER%-backup" (
        echo [INFO] Restoring backup due to extraction error...
        move "%PROJECT_FOLDER%-backup" "%PROJECT_FOLDER%" >nul
    )
)
pause
exit /b 1

:verify_installation
echo.
echo [STEP 5/6] Verifying installation...

if not exist "%PROJECT_FOLDER%\start.bat" (
    echo [ERROR] Verification failed - start.bat not found
    echo [ERROR] Installation appears to be incomplete
    pause
    exit /b 1
)

if not exist "%PROJECT_FOLDER%\backend" (
    echo [WARNING] Backend folder not found - some features may not work
)

if not exist "%PROJECT_FOLDER%\frontend" (
    echo [WARNING] Frontend folder not found - some features may not work
)

echo [OK] Installation verified successfully

:run_existing
echo.
echo [STEP 6/6] Starting %APP_NAME%...

if not exist "%PROJECT_FOLDER%\start.bat" (
    echo [ERROR] Cannot start - start.bat not found in %PROJECT_FOLDER%
    pause
    exit /b 1
)

echo [INFO] Changing to project directory: %PROJECT_FOLDER%
cd /d "%PROJECT_FOLDER%"

echo [INFO] Current directory: %CD%
echo.
echo ================================================================
echo  Launching %APP_NAME%...
echo ================================================================
echo.

REM Start the application
call start.bat

echo.
echo ================================================================
echo  %APP_NAME% Deployment Manager - Session Complete
echo ================================================================
echo.
echo The deployment manager has completed its tasks.
echo.
echo To run this again:
echo - For updates: Run this script in the same folder
echo - For fresh install: Run this script in a new empty folder
echo.
pause
exit /b 0
