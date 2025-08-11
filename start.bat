@echo off
echo Starting Booklet Scanner Application...
echo.

echo Checking Python installation...
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    echo [OK] Python found using 'py' launcher
    py --version
    goto :pythonfound
)

python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    echo [OK] Python found using 'python' command
    python --version
    goto :pythonfound
)

echo [ERROR] Python is not installed or not accessible
echo.
echo Auto-installing Python 3.9.13...
echo.

if exist "PythonSetup\python-3.9.13-amd64.exe" (
    echo [INFO] Found Python installer: PythonSetup\python-3.9.13-amd64.exe
    echo.
    echo Installing Python with the following options:
    echo - Add Python to PATH
    echo - Install for all users  
    echo - Include pip, tcl/tk and IDLE
    echo - Associate files with Python
    echo.
    echo Starting installation... Please wait...
    echo.
    
    "PythonSetup\python-3.9.13-amd64.exe" /passive InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_launcher=1 InstallLauncherAllUsers=1 AssociateFiles=1 SimpleInstall=1
    
    if %errorlevel% equ 0 (
        echo.
        echo [OK] Python installation completed successfully!
        echo.
        echo Verifying Python installation...
        timeout /t 3 /nobreak >nul
        
        py --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py
            echo [OK] Python verification successful!
            py --version
        ) else (
            python --version >nul 2>&1
            if %errorlevel% equ 0 (
                set PYTHON_CMD=python
                echo [OK] Python verification successful!
                python --version
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
) else (
    echo [ERROR] Python installer not found: PythonSetup\python-3.9.13-amd64.exe
    echo Please download Python 3.9.13 and place it in the PythonSetup folder
    pause
    exit /b 1
)

:pythonfound
echo.
echo Setting up virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    %PYTHON_CMD% -m venv venv
)

echo Activating virtual environment...
call venv\Scripts\activate

echo Installing/updating dependencies...
pip install -r requirements.txt

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
echo  AUTO-SHUTDOWN ENABLED:
echo  - Server will automatically stop when you
echo    close the browser tab or window
echo  - No need to manually stop the server!
echo  - Just close the browser when done
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
