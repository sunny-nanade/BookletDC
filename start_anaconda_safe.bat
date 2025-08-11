@echo off
setlocal enabledelayedexpansion
REM ================================================================
REM  Booklet Scanner - Anaconda-Safe Launcher
REM  Handles Anaconda, Miniconda, and standard Python installations
REM ================================================================

echo.
echo ================================================================
echo  Starting Booklet Scanner Application...
echo ================================================================
echo.

echo Checking Python installation...

REM Detect if we're in an Anaconda environment
if defined CONDA_DEFAULT_ENV (
    echo [INFO] Anaconda/Conda environment detected: %CONDA_DEFAULT_ENV%
    echo [INFO] Using conda environment Python
    set PYTHON_CMD=python
    set PYTHON_FOUND=1
    python --version
    goto :setup_environment
)

REM Check for Anaconda in PATH (even if not activated)
where conda >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Anaconda/Conda installation detected
    echo [INFO] Activating base environment...
    call conda activate base 2>nul
    if !errorlevel! equ 0 (
        set PYTHON_CMD=python
        set PYTHON_FOUND=1
        echo [OK] Using Anaconda Python
        python --version
        goto :setup_environment
    )
)

REM Standard Python detection (non-Anaconda systems)
set PYTHON_CMD=
set PYTHON_FOUND=0

REM Try python command first
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    set PYTHON_FOUND=1
    echo [OK] Python found using 'python' command
    python --version
    goto :setup_environment
)

REM Try py launcher
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    set PYTHON_FOUND=1
    echo [OK] Python found using 'py' launcher
    py --version
    goto :setup_environment
)

REM Try python3 command
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    set PYTHON_FOUND=1
    echo [OK] Python found using 'python3' command
    python3 --version
    goto :setup_environment
)

REM Python not found - proceed with installation
echo [ERROR] Python is not installed or not accessible
echo.
echo Auto-installing Python 3.9.13...
echo.

REM Check if Python installer exists locally
if exist "PythonSetup\python-3.9.13-amd64.exe" (
    echo [INFO] Found Python installer: PythonSetup\python-3.9.13-amd64.exe
    set "PYTHON_INSTALLER=PythonSetup\python-3.9.13-amd64.exe"
    goto :install_python
)

REM Download Python installer if not found
echo [INFO] Python installer not found locally. Downloading from python.org...
echo [INFO] This may take a few minutes depending on your internet speed...
echo.

REM Create PythonSetup directory if it doesn't exist
if not exist "PythonSetup" mkdir "PythonSetup"

REM Download Python 3.9.13 from official Python website
set "PYTHON_URL=https://www.python.org/ftp/python/3.9.13/python-3.9.13-amd64.exe"
set "PYTHON_INSTALLER=PythonSetup\python-3.9.13-amd64.exe"

echo [INFO] Downloading from: %PYTHON_URL%
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_INSTALLER%' -UseBasicParsing; Write-Host '[OK] Download completed successfully' } catch { Write-Host '[ERROR] Download failed: ' + $_.Exception.Message; exit 1 }}"

if %errorlevel% neq 0 (
    echo [ERROR] Failed to download Python installer
    echo [INFO] Please check your internet connection and try again
    pause
    exit /b 1
)

:install_python
echo Installing Python with the following options:
echo - Add Python to PATH
echo - Install for all users  
echo - Include pip, tcl/tk and IDLE
echo - Associate files with Python
echo.
echo Starting installation... Please wait...
echo.

"%PYTHON_INSTALLER%" /passive InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_launcher=1 InstallLauncherAllUsers=1 AssociateFiles=1 SimpleInstall=1

if %errorlevel% equ 0 (
    echo.
    echo [OK] Python installation completed successfully!
    echo.
    echo Verifying Python installation...
    timeout /t 3 /nobreak >nul
    
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python
        echo [OK] Python verification successful!
        python --version
        goto :setup_environment
    ) else (
        py --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py
            echo [OK] Python verification successful!
            py --version
            goto :setup_environment
        ) else (
            echo [WARNING] Python installed but not immediately available
            echo Please restart this script or open a new command prompt
            pause
            exit /b 0
        )
    )
) else (
    echo.
    echo [ERROR] Python installation failed with error code: %errorlevel%
    echo Please try running as administrator or install manually
    pause
    exit /b 1
)

:setup_environment
echo.
echo ================================================================
echo  Setting up Python Environment
echo ================================================================
echo.

REM For Anaconda users, don't create venv - use conda environment
if defined CONDA_DEFAULT_ENV (
    echo [INFO] Using existing Conda environment: %CONDA_DEFAULT_ENV%
    echo [INFO] Installing dependencies via pip...
    goto :install_dependencies
)

REM For standard Python, create virtual environment
echo Setting up virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        echo [INFO] Continuing with system Python...
        goto :install_dependencies
    )
)

echo Activating virtual environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo [OK] Virtual environment activated
) else (
    echo [WARNING] Virtual environment activation failed, using system Python
)

:install_dependencies
echo Installing/updating dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    echo [INFO] Please check your internet connection and try again
    pause
    exit /b 1
)

echo.
echo ================================================================
echo  Starting Booklet Scanner
echo ================================================================
echo.

echo Starting Booklet Scanner Application...
echo Opening browser at: http://127.0.0.1:9000
echo.

REM Start the Python server using uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 9000 --reload

echo.
echo Server stopped. Press any key to exit...
pause
