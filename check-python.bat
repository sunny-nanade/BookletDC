@echo off
chcp 65001 >nul
echo.
echo 🔍 Python Installation Checker
echo ========================================
echo.

echo Checking Python installation status...
py --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python is installed and accessible via 'py' launcher
    py --version
    echo.
    echo Checking pip...
    py -m pip --version 2>nul
    if %errorlevel% equ 0 (
        echo ✅ pip is working correctly
    ) else (
        echo ❌ pip is not working properly
    )
) else (
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Python is installed and accessible via 'python' command
        python --version
        echo.
        echo Checking pip...
        python -m pip --version 2>nul
        if %errorlevel% equ 0 (
            echo ✅ pip is working correctly
        ) else (
            echo ❌ pip is not working properly
        )
    ) else (
        echo ❌ Python is not installed or not accessible
        echo.
        echo 💡 Run start.bat to automatically install Python with correct settings
    )
)

echo.
echo Checking Python installer...
if exist "PythonSetup\python-3.9.13-amd64.exe" (
    echo ✅ Python installer ready: PythonSetup\python-3.9.13-amd64.exe
    for %%A in ("PythonSetup\python-3.9.13-amd64.exe") do echo    📦 File size: %%~zA bytes
    for %%A in ("PythonSetup\python-3.9.13-amd64.exe") do echo    📅 Date: %%~tA
    echo    🎉 No download needed - installer is already included!
) else (
    echo ❌ Python installer not found: PythonSetup\python-3.9.13-amd64.exe
    echo.
    echo ⚠️  This is unexpected - the installer should be included in the project!
    echo    Please check that you have the complete project files.
)

echo.
echo Checking PythonSetup folder...
if exist "PythonSetup" (
    echo ✅ PythonSetup folder exists
    echo 📁 Contents:
    dir /b "PythonSetup" 2>nul | findstr /v "^$"
    if %errorlevel% neq 0 (
        echo    (empty)
    )
) else (
    echo ❌ PythonSetup folder not found
    echo 🔧 Creating PythonSetup folder...
    mkdir "PythonSetup"
    if exist "PythonSetup" (
        echo ✅ PythonSetup folder created successfully
    ) else (
        echo ❌ Failed to create PythonSetup folder
    )
)

echo.
echo ========================================
echo 🚀 Auto-Installation Features:
echo.
echo When you run start.bat, it will automatically:
echo • ✅ Install Python 3.9.13 if not found
echo • ✅ Add Python to PATH
echo • ✅ Install for all users  
echo • ✅ Disable path length limit
echo • ✅ Include pip, tcl/tk and IDLE
echo • ✅ Associate .py files with Python
echo • ✅ Show installation progress in real-time
echo.
echo 💡 Just run start.bat and everything will be set up automatically!
echo ========================================
echo.
pause
