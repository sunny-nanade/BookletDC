@echo off
REM Post-Python Installation Helper Script
REM This script runs in a fresh command prompt after Python installation

echo.
echo ================================================================
echo Post-Python Installation Setup
echo ================================================================
echo.

echo [INFO] Setting up Booklet Scanner after Python installation...
echo [INFO] Python should now be available in this fresh environment

REM Change to the correct directory
cd /d "%~dp0"

echo [INFO] Current directory: %CD%
echo.

echo Verifying Python installation...

REM Try to find Python
set PYTHON_CMD=
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    echo [OK] Python found using 'py' launcher
    py --version
) else (
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python
        echo [OK] Python found using 'python' command
        python --version
    ) else (
        echo [ERROR] Python still not available after installation
        echo [INFO] Please try running start.bat manually, or restart your computer
        pause
        exit /b 1
    )
)

echo.
echo ================================================================
echo Setting up Python Environment
echo ================================================================
echo.

echo Setting up virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment
        echo [INFO] Continuing with system Python...
        goto :install_deps_system
    )
    echo [OK] Virtual environment created successfully
) else (
    echo [INFO] Virtual environment already exists
)

echo Activating virtual environment...
call venv\Scripts\activate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment
    echo [INFO] Continuing with system Python...
    goto :install_deps_system
)

echo [OK] Virtual environment activated
goto :install_deps

:install_deps_system
echo [INFO] Using system Python installation

:install_deps
echo Installing/updating dependencies...

REM Check if pip is available
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] pip command not available directly
    echo [INFO] Trying to use pip via Python module...
    %PYTHON_CMD% -m pip --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] pip is not available
        echo [INFO] Trying to install pip...
        %PYTHON_CMD% -m ensurepip --upgrade
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to install pip
            pause
            exit /b 1
        )
    )
    set "PIP_CMD=%PYTHON_CMD% -m pip"
) else (
    set "PIP_CMD=pip"
)

echo [OK] pip is available
%PIP_CMD% --version

echo [INFO] Installing required packages...
%PIP_CMD% install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo [INFO] Attempting to continue anyway...
    timeout /t 3 /nobreak >nul
) else (
    echo [OK] Dependencies installed successfully
)

echo.
echo Starting Booklet Scanner Application...
echo Opening browser at: http://127.0.0.1:9000
echo.

echo Starting server...
timeout /t 2 /nobreak >nul

echo Opening browser...
start http://127.0.0.1:9000

echo.
echo ============================================
echo  SHUTDOWN PROCESS:
echo  1. Close the browser window/tab first
echo  2. Then close terminal: Press Ctrl+C, then Y
echo  3. Or simply close the terminal window (X button)
echo  - Auto-shutdown is disabled for uninterrupted scanning
echo ============================================
echo.
echo Server starting... Browser should open automatically.
echo.

uvicorn backend.main:app --host 0.0.0.0 --port 9000 --reload

echo.
echo Server has stopped automatically.
echo You can close this window.
timeout /t 3 >nul
exit
