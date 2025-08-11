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
    echo [INFO] Alternatively, you can:
    echo [INFO] 1. Download Python 3.9.13 manually from python.org
    echo [INFO] 2. Place it in PythonSetup\python-3.9.13-amd64.exe
    echo [INFO] 3. Run this script again
    echo.
    pause
    exit /b 1
)

if not exist "%PYTHON_INSTALLER%" (
    echo [ERROR] Python installer download failed - file not found
    pause
    exit /b 1
)

echo [OK] Python installer downloaded successfully
echo.

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
        
        py --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py
            echo [OK] Python verification successful!
            py --version
            goto :pythonfound
        ) else (
            python --version >nul 2>&1
            if %errorlevel% equ 0 (
                set PYTHON_CMD=python
                echo [OK] Python verification successful!
                python --version
                goto :pythonfound
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
