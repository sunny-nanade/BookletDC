@echo off
echo ================================================================
echo  Booklet Scanner - Simple Deployment Manager
echo ================================================================
echo.

REM Configuration - Update these values for your GitHub repo
set GITHUB_USER=your-username
set REPO_NAME=BookletDC
set ZIP_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%/archive/refs/heads/main.zip
set PROJECT_DIR=%CD%\%REPO_NAME%
set TEMP_ZIP=%CD%\booklet-scanner-temp.zip

echo [INFO] Repository: https://github.com/%GITHUB_USER%/%REPO_NAME%
echo [INFO] Target Directory: %PROJECT_DIR%
echo.

echo [1/5] Checking PowerShell availability...
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PowerShell is not available
    echo [ERROR] This script requires PowerShell for downloading files
    pause
    exit /b 1
)
echo [OK] PowerShell is available

echo.
echo [2/5] Checking existing installation...
if exist "%PROJECT_DIR%" (
    echo [INFO] Existing installation found: %PROJECT_DIR%
    echo.
    echo Choose an option:
    echo 1. Update existing installation (recommended)
    echo 2. Keep existing and just run it
    echo 3. Delete and reinstall fresh
    echo.
    set /p choice="Enter your choice (1-3): "
    
    if "%choice%"=="1" goto :download_update
    if "%choice%"=="2" goto :run_existing
    if "%choice%"=="3" goto :delete_and_fresh
    
    echo [INFO] Invalid choice, defaulting to update...
    goto :download_update
) else (
    echo [INFO] No existing installation found
    goto :download_fresh
)

:delete_and_fresh
echo [INFO] Removing existing installation...
rmdir /s /q "%PROJECT_DIR%" 2>nul
echo [OK] Existing installation removed

:download_fresh
echo.
echo [3/5] Downloading latest version from GitHub...
goto :download_files

:download_update
echo.
echo [3/5] Downloading updates from GitHub...

:download_files
echo [INFO] Downloading: %ZIP_URL%
echo [INFO] This may take a few minutes depending on your internet connection...
echo.

REM Use PowerShell to download the ZIP file
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile '%TEMP_ZIP%' -UseBasicParsing}"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to download project from GitHub
    echo.
    echo Possible causes:
    echo 1. Repository URL is incorrect: %ZIP_URL%
    echo 2. Repository is private
    echo 3. Network connectivity issues
    echo 4. GitHub is temporarily unavailable
    echo.
    pause
    exit /b 1
)

if not exist "%TEMP_ZIP%" (
    echo [ERROR] Download failed - ZIP file not found
    pause
    exit /b 1
)

echo [OK] Download completed

echo.
echo [4/5] Extracting project files...

REM Extract ZIP file using PowerShell
powershell -Command "& {Expand-Archive -Path '%TEMP_ZIP%' -DestinationPath '%CD%\temp-extract' -Force}"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to extract ZIP file
    del "%TEMP_ZIP%" 2>nul
    pause
    exit /b 1
)

REM GitHub creates a folder like "BookletDC-main" inside the ZIP
set EXTRACTED_FOLDER=%CD%\temp-extract\%REPO_NAME%-main

if exist "%EXTRACTED_FOLDER%" (
    echo [INFO] Moving files to project directory...
    
    REM Remove old project directory if updating
    if exist "%PROJECT_DIR%" (
        rmdir /s /q "%PROJECT_DIR%" 2>nul
    )
    
    REM Move extracted folder to final location
    move "%EXTRACTED_FOLDER%" "%PROJECT_DIR%" >nul
    
    if %errorlevel% equ 0 (
        echo [OK] Project files installed successfully
    ) else (
        echo [ERROR] Failed to move project files
        goto :cleanup_and_exit
    )
) else (
    echo [ERROR] Extracted folder not found: %EXTRACTED_FOLDER%
    echo [ERROR] ZIP file structure may be different than expected
    goto :cleanup_and_exit
)

REM Cleanup temporary files
rmdir /s /q "%CD%\temp-extract" 2>nul
del "%TEMP_ZIP%" 2>nul

goto :run_project

:run_existing
echo [INFO] Using existing installation...

:run_project
echo.
echo [5/5] Preparing to start Booklet Scanner...

if not exist "%PROJECT_DIR%\start.bat" (
    echo [ERROR] start.bat not found in: %PROJECT_DIR%
    echo [ERROR] Installation may be incomplete or corrupted
    echo.
    pause
    exit /b 1
)

echo [INFO] Changing to project directory: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"

echo [INFO] Current directory: %CD%
echo.

echo ================================================================
echo  Starting Booklet Scanner Application
echo ================================================================
echo.

REM Execute the project's start.bat
call start.bat

goto :end

:cleanup_and_exit
echo [INFO] Cleaning up temporary files...
rmdir /s /q "%CD%\temp-extract" 2>nul
del "%TEMP_ZIP%" 2>nul
pause
exit /b 1

:end
echo.
echo ================================================================
echo  Booklet Scanner Deployment Complete
echo ================================================================
echo.
echo Next time you run this script:
echo - It will check for your existing installation
echo - Offer to update with latest changes from GitHub
echo - Start the application automatically
echo.
pause
exit
