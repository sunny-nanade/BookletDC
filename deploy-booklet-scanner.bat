@echo off
echo ================================================================
echo  Booklet Scanner - GitHub Deployment Manager
echo ================================================================
echo.

REM Configuration - Update these values for your GitHub repo
set GITHUB_USER=your-username
set REPO_NAME=BookletDC
set REPO_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%.git
set PROJECT_DIR=%CD%\%REPO_NAME%

echo [INFO] Repository: %REPO_URL%
echo [INFO] Target Directory: %PROJECT_DIR%
echo.

REM Check if Git is installed
echo [1/6] Checking Git installation...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed or not in PATH
    echo.
    echo Please install Git first:
    echo 1. Download from: https://git-scm.com/download/win
    echo 2. Install with default options
    echo 3. Restart this script
    echo.
    pause
    exit /b 1
)
echo [OK] Git is available
git --version

echo.
echo [2/6] Checking if project already exists...
if exist "%PROJECT_DIR%" (
    echo [INFO] Project directory found: %PROJECT_DIR%
    echo [INFO] Checking if it's a valid Git repository...
    
    cd /d "%PROJECT_DIR%"
    git status >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Valid Git repository found
        echo.
        echo [3/6] Updating existing project...
        echo [INFO] Fetching latest changes from GitHub...
        
        git fetch origin
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to fetch from remote repository
            echo [INFO] This might be a network issue or repository access problem
            echo.
            goto :run_existing
        )
        
        echo [INFO] Checking for updates...
        git status -uno
        
        REM Check if there are updates available
        git diff --quiet HEAD origin/main
        if %errorlevel% equ 0 (
            echo [OK] Project is already up to date
        ) else (
            echo [INFO] Updates available, pulling changes...
            
            REM Stash any local changes first
            git stash push -m "Auto-stash before update on %date% %time%"
            
            REM Pull latest changes
            git pull origin main
            if %errorlevel% equ 0 (
                echo [OK] Project updated successfully
            ) else (
                echo [ERROR] Failed to update project
                echo [INFO] Continuing with existing version...
            )
        )
        
        goto :run_project
    ) else (
        echo [WARNING] Directory exists but is not a Git repository
        echo [INFO] Removing invalid directory and re-cloning...
        cd /d "%CD%"
        rmdir /s /q "%PROJECT_DIR%"
        goto :clone_fresh
    )
) else (
    echo [INFO] Project directory not found, will clone fresh copy
    goto :clone_fresh
)

:clone_fresh
echo.
echo [3/6] Downloading project from GitHub...
echo [INFO] Cloning repository: %REPO_URL%
echo [INFO] This may take a few minutes depending on your internet connection...
echo.

git clone %REPO_URL%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to clone repository
    echo.
    echo Possible causes:
    echo 1. Repository URL is incorrect
    echo 2. Repository is private and requires authentication
    echo 3. Network connectivity issues
    echo 4. Git credentials not configured
    echo.
    echo Please check:
    echo - Repository exists: %REPO_URL%
    echo - You have access to the repository
    echo - Your internet connection
    echo.
    pause
    exit /b 1
)

echo [OK] Repository cloned successfully
goto :run_project

:run_existing
echo [INFO] Continuing with existing project version...

:run_project
echo.
echo [4/6] Verifying project structure...
if not exist "%PROJECT_DIR%\start.bat" (
    echo [ERROR] start.bat not found in project directory
    echo [ERROR] This doesn't appear to be a valid Booklet Scanner project
    echo.
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%\PythonSetup" (
    echo [WARNING] PythonSetup folder not found
    echo [INFO] Python auto-installation may not work
)

echo [OK] Project structure appears valid

echo.
echo [5/6] Preparing to start Booklet Scanner...
echo [INFO] Changing to project directory: %PROJECT_DIR%
cd /d "%PROJECT_DIR%"

echo [INFO] Current directory: %CD%
echo [INFO] Starting Booklet Scanner application...
echo.

echo [6/6] Launching Booklet Scanner...
echo ================================================================
echo  Starting Booklet Scanner Application
echo ================================================================
echo.

REM Execute the project's start.bat
call start.bat

echo.
echo ================================================================
echo  Booklet Scanner Deployment Complete
echo ================================================================
echo.
echo Next time you run this script:
echo - It will check for updates automatically
echo - Download any new changes from GitHub
echo - Start the application with latest version
echo.
pause
exit
