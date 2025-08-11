@echo off
REM Quick test of Python detection logic
echo Testing Python detection...

py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    echo [OK] Python found with 'py' command
    py --version
    echo Script would continue to :pythonfound
    goto :success
) else (
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python
        echo [OK] Python found with 'python' command
        python --version
        echo Script would continue to :pythonfound
        goto :success
    ) else (
        echo [ERROR] Python not found - would trigger installation
        goto :end
    )
)

:success
echo [TEST] Python detection logic working correctly!
goto :end

:end
pause
