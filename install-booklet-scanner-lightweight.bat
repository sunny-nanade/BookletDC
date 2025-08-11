@echo off
REM ================================================================
REM  Booklet Scanner - Lightweight One-Click Installer
REM  Downloads Python automatically if needed (no large files in repo)
REM ================================================================

REM CONFIGURATION - Update these for your GitHub repository
set REPO_USER=sunny-nanade
set REPO_NAME=BookletDC

REM Auto-generated URLs
set REPO_URL=https://github.com/%REPO_USER%/%REPO_NAME%
set ZIP_URL=%REPO_URL%/archive/refs/heads/main.zip

echo.
echo ================================================================
echo  Booklet Scanner - Lightweight One-Click Installer
echo ================================================================
echo  Repository: %REPO_URL%
echo  Installing to: %CD%\%REPO_NAME%
echo ================================================================
echo.

REM Check if already installed
if exist "%REPO_NAME%" (
    echo [UPDATE] Existing installation detected
    set /p update_choice="Update to latest version? (Y/N): "
    if /i "!update_choice!"=="Y" (
        echo [INFO] Backing up existing installation...
        if exist "%REPO_NAME%-backup" rmdir /s /q "%REPO_NAME%-backup"
        move "%REPO_NAME%" "%REPO_NAME%-backup" >nul
        echo [OK] Backup created: %REPO_NAME%-backup
    ) else (
        echo [INFO] Using existing installation
        goto :run_existing
    )
)

echo [INSTALL] Installing fresh copy...

echo [1/4] Downloading from GitHub...
REM Download with better error handling
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Write-Host '[INFO] Starting download...'; Invoke-WebRequest -Uri '%ZIP_URL%' -OutFile 'temp.zip' -UseBasicParsing; Write-Host '[OK] Download completed' } catch { Write-Host '[ERROR] Download failed: ' + $_.Exception.Message; exit 1 }}"

if not exist "temp.zip" (
    echo [ERROR] Download failed. Check internet connection and repository URL.
    pause & exit /b 1
)

echo [2/4] Extracting files...
powershell -Command "Expand-Archive 'temp.zip' -DestinationPath 'temp-extract' -Force"
if exist "temp-extract\%REPO_NAME%-main" (
    move "temp-extract\%REPO_NAME%-main" "%REPO_NAME%" >nul 2>&1
    rmdir temp-extract >nul 2>&1
) else (
    echo [ERROR] Extraction failed - unexpected folder structure
    pause & exit /b 1
)
del temp.zip

echo [3/4] Creating desktop shortcut...
if exist "%REPO_NAME%\create_desktop_shortcut_silent.bat" (
    cd %REPO_NAME%
    call create_desktop_shortcut_silent.bat
    cd ..
    echo [OK] Desktop shortcut created
) else if exist "%REPO_NAME%\create_desktop_shortcut.bat" (
    cd %REPO_NAME%
    echo Y | call create_desktop_shortcut.bat >nul 2>&1
    cd ..
    echo [OK] Desktop shortcut created
) else (
    echo [WARNING] Desktop shortcut script not found
)

echo [4/4] Starting Booklet Scanner...

:run_existing
if exist "%REPO_NAME%\start_lightweight.bat" (
    cd %REPO_NAME%
    echo.
    echo ================================================================
    echo  Launching Booklet Scanner (Lightweight Mode)...
    echo ================================================================
    echo.
    call start_lightweight.bat
) else if exist "%REPO_NAME%\start.bat" (
    cd %REPO_NAME%
    echo.
    echo ================================================================
    echo  Launching Booklet Scanner...
    echo ================================================================
    echo.
    call start.bat
) else (
    echo [ERROR] Installation failed - startup script not found
    echo [INFO] Please check the installation and try again
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  Installation Complete!
echo ================================================================
echo.
echo Booklet Scanner has been installed and is ready to use!
echo Desktop shortcut created for future access.
echo.
pause
