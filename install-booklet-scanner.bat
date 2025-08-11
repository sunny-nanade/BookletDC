@echo off
REM ================================================================
REM  Booklet Scanner - One-Click Installer
REM  Run this file in any empty folder to install and start
REM ================================================================

REM CONFIGURATION - Update these for your GitHub repository
set REPO_USER=sunny-nanade
set REPO_NAME=BookletDC

REM Auto-generated URLs
set REPO_URL=https://github.com/%REPO_USER%/%REPO_NAME%
set ZIP_URL=%REPO_URL%/archive/refs/heads/main.zip

echo.
echo ================================================================
echo  Booklet Scanner - One-Click Installer
echo ================================================================
echo  Repository: %REPO_URL%
echo  Installing to: %CD%\%REPO_NAME%
echo ================================================================
echo.

REM Quick check for existing installation
if exist "%REPO_NAME%\start.bat" (
    echo [UPDATE] Existing installation found
    echo.
    set /p update="Update to latest version? (Y/N): "
    if /i "%update%"=="N" (
        echo [INFO] Starting existing installation...
        cd %REPO_NAME%
        call start.bat
        exit
    )
    echo [INFO] Updating installation...
    rmdir /s /q "%REPO_NAME%" 2>nul
) else (
    echo [INSTALL] Installing fresh copy...
)

echo [1/3] Downloading from GitHub...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest '%ZIP_URL%' -OutFile 'temp.zip'"

if not exist "temp.zip" (
    echo [ERROR] Download failed. Check internet connection and repository URL.
    pause & exit /b 1
)

echo [2/3] Extracting files...
powershell -Command "Expand-Archive 'temp.zip' -Force"
move "%REPO_NAME%-main" "%REPO_NAME%" >nul 2>&1
del temp.zip

echo [3/4] Creating desktop shortcut...
if exist "%REPO_NAME%\create_desktop_shortcut.bat" (
    cd %REPO_NAME%
    call create_desktop_shortcut.bat >nul 2>&1
    cd ..
)

echo [4/4] Starting Booklet Scanner...
if exist "%REPO_NAME%\start.bat" (
    cd %REPO_NAME%
    echo.
    call start.bat
) else (
    echo [ERROR] Installation failed - start.bat not found
    pause
)
