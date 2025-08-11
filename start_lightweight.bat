@echo off
setlocal enabledelayedexpansion
REM ================================================================
REM  Booklet Scanner - Lightweight Launcher (No Python Bundled)
REM  This version downloads Python if needed or guides user installation
REM ================================================================

echo.
echo ================================================================
echo  Starting Booklet Scanner Application...
echo ================================================================
echo.

echo Checking Python installation...

REM Check for Python using various methods
set PYTHON_CMD=
set PYTHON_FOUND=0

REM Method 1: Try 'py' launcher (Windows Python Launcher)
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    set PYTHON_FOUND=1
    echo [OK] Python found using 'py' launcher
    py --version
    goto :python_found
)

REM Method 2: Try 'python' command
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    set PYTHON_FOUND=1
    echo [OK] Python found using 'python' command
    python --version
    goto :python_found
)

REM Method 3: Try 'python3' command
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    set PYTHON_FOUND=1
    echo [OK] Python found using 'python3' command
    python3 --version
    goto :python_found
)

REM Python not found - offer installation options
echo [ERROR] Python is not installed or not accessible
echo.
echo ================================================================
echo  Python Installation Required
echo ================================================================
echo.
echo Choose an installation method:
echo.
echo [1] Download and install Python automatically (Recommended)
echo [2] Install from Microsoft Store (Windows 10/11)
echo [3] Manual installation instructions
echo [4] Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto :auto_install
if "%choice%"=="2" goto :store_install
if "%choice%"=="3" goto :manual_install
if "%choice%"=="4" goto :exit_app
goto :invalid_choice

:auto_install
echo.
echo ================================================================
echo  Automatic Python Installation
echo ================================================================
echo.
echo Downloading Python 3.9.13 from python.org...
echo This may take a few minutes depending on your internet speed.
echo.

REM Create PythonSetup directory if it doesn't exist
if not exist "PythonSetup" mkdir "PythonSetup"

REM Download Python installer
set "PYTHON_URL=https://www.python.org/ftp/python/3.9.13/python-3.9.13-amd64.exe"
set "PYTHON_INSTALLER=PythonSetup\python-3.9.13-amd64.exe"

echo [INFO] Downloading from: %PYTHON_URL%
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'Continue'; try { Write-Host '[INFO] Starting download...'; Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_INSTALLER%' -UseBasicParsing; Write-Host '[OK] Download completed successfully' } catch { Write-Host '[ERROR] Download failed: ' + $_.Exception.Message; exit 1 }}"

if %errorlevel% neq 0 (
    echo [ERROR] Download failed. Please check your internet connection.
    echo [INFO] Trying alternative installation methods...
    goto :store_install
)

if not exist "%PYTHON_INSTALLER%" (
    echo [ERROR] Download failed - installer not found
    goto :store_install
)

echo.
echo [INFO] Installing Python with optimal settings...
echo [INFO] This requires administrator privileges
echo.

REM Install Python with all necessary options
"%PYTHON_INSTALLER%" /passive InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_launcher=1 InstallLauncherAllUsers=1 AssociateFiles=1 SimpleInstall=1

if %errorlevel% neq 0 (
    echo [ERROR] Python installation failed with error code: %errorlevel%
    echo [INFO] This might be due to insufficient privileges
    echo [INFO] Trying Microsoft Store installation...
    goto :store_install
)

echo [OK] Python installation completed!
echo [INFO] Verifying installation...
timeout /t 3 /nobreak >nul

REM Verify installation
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    set PYTHON_FOUND=1
    echo [OK] Python verification successful
    goto :python_found
) else (
    echo [WARNING] Python installation may need system restart
    echo [INFO] Trying Microsoft Store installation as fallback...
    goto :store_install
)

:store_install
echo.
echo ================================================================
echo  Microsoft Store Python Installation
echo ================================================================
echo.
echo Opening Microsoft Store to install Python...
echo.
echo [INFO] This will open the Microsoft Store Python page
echo [INFO] Click 'Install' and wait for completion
echo [INFO] Then restart this application
echo.
echo Press any key to open Microsoft Store...
pause >nul

REM Open Microsoft Store Python page
start ms-windows-store://pdp/?ProductId=9NRWMJP3717K

echo.
echo [INFO] After Python installation is complete:
echo [INFO] 1. Close this window
echo [INFO] 2. Run this application again
echo [INFO] 3. Python should be detected automatically
echo.
pause
goto :exit_app

:manual_install
echo.
echo ================================================================
echo  Manual Python Installation Instructions
echo ================================================================
echo.
echo 1. Go to: https://www.python.org/downloads/
echo 2. Download Python 3.9 or newer (recommended: 3.9.13)
echo 3. Run the installer with these important settings:
echo    - Check "Add Python to PATH" (IMPORTANT!)
echo    - Check "Install for all users" (if you have admin rights)
echo    - Include pip, tcl/tk and IDLE
echo 4. After installation, restart this application
echo.
echo Opening Python download page in your browser...
start https://www.python.org/downloads/
echo.
pause
goto :exit_app

:invalid_choice
echo.
echo [ERROR] Invalid choice. Please enter 1, 2, 3, or 4.
echo.
goto :auto_install

:python_found
echo.
echo ================================================================
echo  Python Installation Verified - Starting Application
echo ================================================================
echo.

REM Continue with the rest of your start.bat logic here
REM Check for virtual environment, install packages, start server, etc.

echo Setting up virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment
    pause
    exit /b 1
)

echo Installing/updating dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo Starting Booklet Scanner Application...
echo Opening browser at: http://127.0.0.1:9000
echo.

REM Start the server
start /min cmd /c "python backend/main.py"

REM Give server time to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://127.0.0.1:9000

echo.
echo ================================================================
echo  Booklet Scanner is now running!
echo ================================================================
echo.
echo Browser should open automatically to: http://127.0.0.1:9000
echo.
echo To stop the server:
echo - Close the browser tab/window (auto-shutdown enabled)
echo - Or press Ctrl+C in the server window
echo.

pause

:exit_app
echo.
echo Thank you for using Booklet Scanner!
pause
exit /b 0
