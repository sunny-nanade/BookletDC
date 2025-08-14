@echo off
echo Starting Booklet Scanner Application...
echo.

echo Checking Python installation...

REM Anaconda-safe Python detection
set PYTHON_CMD=
set PYTHON_FOUND=0

REM Method 1: Try standard python command first (works better with Anaconda)
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    set PYTHON_FOUND=1
    echo [OK] Python found using 'python' command
    python --version
    echo.
    echo Setting up virtual environment...
    goto :setup_venv
)

REM Method 2: Try py launcher as fallback
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    set PYTHON_FOUND=1
    echo [OK] Python found using 'py' launcher
    py --version
    echo.
    echo Setting up virtual environment...
    goto :setup_venv
)

REM Method 3: Try python3 command
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    set PYTHON_FOUND=1
    echo [OK] Python found using 'python3' command
    python3 --version
    echo.
    echo Setting up virtual environment...
    goto :setup_venv
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

REM Test internet connectivity first
echo [INFO] Testing internet connectivity...
ping -n 1 8.8.8.8 >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No internet connection detected
    echo [INFO] Please connect to the internet and try again
    echo [INFO] Or download Python manually from python.org
    pause
    exit /b 1
) else (
    echo [OK] Internet connection confirmed
)

REM Create PythonSetup directory if it doesn't exist
if not exist "PythonSetup" mkdir "PythonSetup"

REM Download Python 3.9.13 from official Python website
set "PYTHON_URL=https://www.python.org/ftp/python/3.9.13/python-3.9.13-amd64.exe"
set "PYTHON_INSTALLER=PythonSetup\python-3.9.13-amd64.exe"

echo [INFO] Downloading from: %PYTHON_URL%
powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference='SilentlyContinue'; try { Invoke-WebRequest -Uri '%PYTHON_URL%' -OutFile '%PYTHON_INSTALLER%' -UseBasicParsing -TimeoutSec 60; Write-Host '[OK] Download completed successfully' } catch { Write-Host '[ERROR] Download failed: ' + $_.Exception.Message; exit 1 }}"

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
        echo [INFO] Refreshing environment variables...
        
        REM Force refresh environment variables by calling a sub-routine
        call :refresh_env
        
        echo Waiting for PATH to update...
        timeout /t 5 /nobreak >nul
        
        echo Verifying Python installation...
        
        REM Try multiple times as PATH might need time to update
        set RETRY_COUNT=0
        :verify_python
        set /a RETRY_COUNT+=1
        
        py --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=py
            echo [OK] Python verification successful using 'py' launcher!
            py --version
            goto :setup_venv
        )
        
        python --version >nul 2>&1
        if %errorlevel% equ 0 (
            set PYTHON_CMD=python
            echo [OK] Python verification successful using 'python' command!
            python --version
            goto :setup_venv
        )
        
        if %RETRY_COUNT% lss 3 (
            echo [INFO] Python not immediately available, retrying in 3 seconds... (attempt %RETRY_COUNT%/3)
            timeout /t 3 /nobreak >nul
            goto :verify_python
        )
        
        echo.
        echo [ERROR] Python installed but not accessible after multiple attempts
        echo [INFO] This can happen due to PATH environment variable not updating immediately
        echo [INFO] Please try one of these solutions:
        echo [INFO] 1. Close this window and run start.bat again
        echo [INFO] 2. Open a new command prompt and run start.bat
        echo [INFO] 3. Restart your computer and try again
        echo.
        pause
        exit /b 1
    ) else (
        echo.
        echo [ERROR] Python installation failed with error code: %errorlevel%
        echo [INFO] Please try one of these solutions:
        echo [INFO] 1. Run this script as Administrator
        echo [INFO] 2. Download Python manually from python.org
        echo [INFO] 3. Check if antivirus is blocking the installation
        echo.
        pause
        exit /b 1
    )

:setup_venv
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
    echo [ERROR] pip is not available
    echo [INFO] Trying to install/repair pip...
    %PYTHON_CMD% -m ensurepip --upgrade
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pip
        echo [INFO] Please check your Python installation
        pause
        exit /b 1
    )
)

echo [OK] pip is available
pip --version

echo [INFO] Installing required packages...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo [INFO] This might be due to:
    echo [INFO] 1. No internet connection
    echo [INFO] 2. Firewall blocking pip
    echo [INFO] 3. Corporate network restrictions
    echo [INFO] 4. Missing requirements.txt file
    echo.
    echo [INFO] Attempting to continue anyway...
    timeout /t 3 /nobreak >nul
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

REM Function to refresh environment variables
:refresh_env
echo [INFO] Attempting to refresh environment variables...
REM This refreshes the current session's environment variables
for /f "tokens=*" %%i in ('reg query "HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do (
    for /f "tokens=2*" %%j in ("%%i") do set "SYSTEM_PATH=%%k"
)
for /f "tokens=*" %%i in ('reg query "HKEY_CURRENT_USER\Environment" /v PATH 2^>nul') do (
    for /f "tokens=2*" %%j in ("%%i") do set "USER_PATH=%%k"
)
if defined USER_PATH (
    set "PATH=%SYSTEM_PATH%;%USER_PATH%"
) else (
    set "PATH=%SYSTEM_PATH%"
)
echo [OK] Environment variables refreshed
goto :eof
