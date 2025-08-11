@echo off
echo Starting Booklet Scanner Application...
echo.

echo Checking Python installation...
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
        echo [ERROR] Python is not installed or not accessible
        echo.
        echo Auto-installing Python 3.9.13...
        echo.
        
        REM Check if Python installer exists
        if exist "PythonSetup\python-3.9.13-amd64.exe" (
            echo [INFO] Found Python installer: PythonSetup\python-3.9.13-amd64.exe
            echo.
            echo Installing Python with the following options:
            echo - Add Python to PATH
            echo - Install for all users
            echo - Disable path length limit
            echo - Include pip, tcl/tk and IDLE
            echo - Associate files with Python
            echo.
            echo Starting installation... Please wait...
            echo.
            
            REM Install Python silently with all recommended options
            "PythonSetup\python-3.9.13-amd64.exe" /passive InstallAllUsers=1 PrependPath=1 Include_test=0 Include_pip=1 Include_tcltk=1 Include_launcher=1 InstallLauncherAllUsers=1 AssociateFiles=1 CompileAll=1 Shortcuts=1 Include_symbols=0 Include_debug=0 SimpleInstall=1
            
            if %errorlevel% equ 0 (
                echo.
                echo [OK] Python installation completed successfully!
                echo.
                echo Verifying Python installation...
                echo Please wait a moment for system to register Python...
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
                        echo This is normal - Python will be available after restart
                        echo.
                        echo Please restart this script or reboot your computer
                        echo Alternatively, open a new command prompt and run start.bat again
                        pause
                        exit /b 0
                    )
                )
            ) else (
                echo.
                echo [ERROR] Python installation failed with error code: %errorlevel%
                echo Please try installing manually or run as administrator
                pause
                exit /b 1
            )
        ) else (
            echo [ERROR] Python installer not found: PythonSetup\python-3.9.13-amd64.exe
            echo.
            echo This is unexpected - the installer should be included in the project!
            echo.
            echo Possible solutions:
            echo 1. Check that you have the complete project files
            echo 2. Download Python 3.9.13 from https://www.python.org/downloads/release/python-3913/
            echo    and save as: PythonSetup\python-3.9.13-amd64.exe
            echo 3. Or install Python manually from the link above
            echo.
            echo Manual installation instructions:
            echo 1. Download Python 3.9.13 from the link above
            echo 2. Run the installer
            echo 3. Check "Add Python to PATH"
            echo 4. Check "Install for all users"
            echo 5. Choose "Customize installation" and enable "Add Python to environment variables"
            pause
            exit /b 1
        )
    )
)

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

REM Start the server - it will auto-shutdown when browser closes
uvicorn backend.main:app --host 0.0.0.0 --port 9000 --reload

echo.
echo Server has stopped automatically.
echo You can close this window.
timeout /t 3 >nul
exit
