REM ================================================================
REM  Booklet Scanner - Deployment Configuration
REM  Edit these values to match your GitHub repository
REM ================================================================

REM GitHub Repository Settings
REM Replace 'your-username' with your actual GitHub username
REM Replace 'BookletDC' with your repository name if different
set GITHUB_USER=your-username
set GITHUB_REPO=BookletDC

REM Branch to deploy (usually 'main' or 'master')
set GITHUB_BRANCH=main

REM Auto-generated URLs (don't change these)
set REPO_URL=https://github.com/%GITHUB_USER%/%GITHUB_REPO%
set ZIP_URL=%REPO_URL%/archive/refs/heads/%GITHUB_BRANCH%.zip
set GIT_URL=%REPO_URL%.git

REM Local settings
set PROJECT_FOLDER=%GITHUB_REPO%

REM Display settings
set APP_NAME=Booklet Scanner
set APP_VERSION=1.0

REM ================================================================
REM  Instructions:
REM  1. Update GITHUB_USER with your GitHub username
REM  2. Update GITHUB_REPO if your repository has a different name
REM  3. Save this file
REM  4. The deployment scripts will use these settings automatically
REM ================================================================
