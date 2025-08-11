@echo off
chcp 65001 >nul
echo.
echo 🧪 Testing Python Installation Command
echo ========================================
echo.

echo Command that will be executed:
echo "PythonSetup\python-3.9.13-amd64.exe" /passive InstallAllUsers=1 PrependPath=1 Include_test=0 Include_pip=1 Include_tcltk=1 Include_launcher=1 InstallLauncherAllUsers=1 AssociateFiles=1 CompileAll=1 Shortcuts=1 Include_symbols=0 Include_debug=0 SimpleInstall=1
echo.

if exist "PythonSetup\python-3.9.13-amd64.exe" (
    echo ✅ Python installer found and ready
    echo.
    echo 💡 This command will:
    echo • Install Python 3.9.13 silently (/passive)
    echo • Add Python to PATH (PrependPath=1)
    echo • Install for all users (InstallAllUsers=1)
    echo • Include pip package manager (Include_pip=1)
    echo • Include Python launcher (Include_launcher=1)
    echo • Associate .py files with Python (AssociateFiles=1)
    echo • Create shortcuts (Shortcuts=1)
    echo • Exclude test suite and debug symbols (for smaller install)
    echo.
    echo ⚠️  NOTE: This is just a test - no installation will happen
    echo    Run start.bat to actually install Python
) else (
    echo ❌ Python installer not found: PythonSetup\python-3.9.13-amd64.exe
)

echo.
echo ========================================
pause
