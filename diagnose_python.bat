@echo off
REM ================================================================
REM  Python Environment Diagnostic Tool
REM  Helps identify Python installation and environment conflicts
REM ================================================================

echo.
echo ================================================================
echo  Python Environment Diagnostic
echo ================================================================
echo.

echo [INFO] Checking Python installations and environments...
echo.

REM Check for Anaconda/Conda
echo === Anaconda/Conda Detection ===
if defined CONDA_DEFAULT_ENV (
    echo [FOUND] Active Conda environment: %CONDA_DEFAULT_ENV%
) else (
    echo [INFO] No active Conda environment
)

if defined CONDA_PREFIX (
    echo [FOUND] Conda prefix: %CONDA_PREFIX%
) else (
    echo [INFO] No Conda prefix set
)

where conda >nul 2>&1
if %errorlevel% equ 0 (
    echo [FOUND] Conda command available
    conda --version 2>nul
) else (
    echo [INFO] Conda command not found
)

echo.

REM Check Python commands
echo === Python Command Detection ===

echo Testing 'python' command:
python --version 2>nul
if %errorlevel% equ 0 (
    echo [OK] 'python' command works
    where python
) else (
    echo [FAIL] 'python' command not available
)

echo.
echo Testing 'py' launcher:
py --version 2>nul
if %errorlevel% equ 0 (
    echo [OK] 'py' launcher works
    where py
) else (
    echo [FAIL] 'py' launcher not available
)

echo.
echo Testing 'python3' command:
python3 --version 2>nul
if %errorlevel% equ 0 (
    echo [OK] 'python3' command works
    where python3
) else (
    echo [FAIL] 'python3' command not available
)

echo.

REM Check PATH
echo === PATH Analysis ===
echo Current PATH contains these Python-related entries:
echo %PATH% | findstr /i python
echo %PATH% | findstr /i conda
echo %PATH% | findstr /i anaconda

echo.

REM Recommendations
echo === Recommendations ===
if defined CONDA_DEFAULT_ENV (
    echo [RECOMMENDATION] Use 'start_anaconda_safe.bat' for Anaconda systems
    echo [RECOMMENDATION] Or activate your preferred conda environment first
) else (
    echo [RECOMMENDATION] Use standard 'start.bat' for regular Python installations
)

echo.
echo === Environment Summary ===
if defined CONDA_DEFAULT_ENV (
    echo Environment Type: Anaconda/Conda
    echo Recommended Launcher: start_anaconda_safe.bat
) else (
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Environment Type: Standard Python
        echo Recommended Launcher: start.bat
    ) else (
        echo Environment Type: No Python detected
        echo Recommended Action: Run installer to download Python
    )
)

echo.
pause
