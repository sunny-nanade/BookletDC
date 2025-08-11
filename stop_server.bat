@echo off
echo Stopping Booklet Scanner Server...
echo.

REM Kill uvicorn and python processes related to our server
echo Stopping server processes...
taskkill /f /im uvicorn.exe >nul 2>&1
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq python.exe" /fo csv ^| findstr "uvicorn\|backend.main"') do (
    taskkill /f /pid %%i >nul 2>&1
)

REM More aggressive cleanup - kill python processes running on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000') do (
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ✅ Server stopped successfully!
echo All related processes have been terminated.
echo.
pause