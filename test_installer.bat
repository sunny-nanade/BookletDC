@echo off
echo Testing Python Installation Command...
echo.

if exist "PythonSetup\python-3.9.13-amd64.exe" (
    echo [OK] Python installer found
    echo.
    echo Testing command syntax...
    echo Command: "PythonSetup\python-3.9.13-amd64.exe" /?
    echo.
    
    REM Test the installer help to verify syntax
    "PythonSetup\python-3.9.13-amd64.exe" /?
    
    echo.
    echo If you saw Python installer help above, the syntax is correct.
    echo.
    echo Full installation command would be:
    echo "PythonSetup\python-3.9.13-amd64.exe" /passive InstallAllUsers=1 PrependPath=1 Include_pip=1 Include_launcher=1 AssociateFiles=1
) else (
    echo [ERROR] Python installer not found: PythonSetup\python-3.9.13-amd64.exe
)

echo.
pause
