@echo off
echo ============================================
echo    Automated Wiki Update Script
echo ============================================
echo.

:: Check if wiki directory exists
if not exist "BookletDC.wiki" (
    echo Cloning Wiki repository...
    git clone https://github.com/sunny-nanade/BookletDC.wiki.git
    if errorlevel 1 (
        echo ERROR: Failed to clone wiki repository
        echo Make sure you have Git installed and repository access
        pause
        exit /b 1
    )
)

:: Enter wiki directory
cd BookletDC.wiki

echo.
echo Updating Wiki pages with clean content...
echo.

:: Copy clean content to wiki pages
echo Updating Installation Guide...
copy "..\wiki-content\Installation-Guide-CLEAN.md" "Installation-Guide.md" >nul
if errorlevel 1 echo WARNING: Could not update Installation-Guide.md

echo Updating Quick Start Guide...
copy "..\wiki-content\Quick-Start-CLEAN.md" "Quick-Start.md" >nul
if errorlevel 1 echo WARNING: Could not update Quick-Start.md

echo Updating Troubleshooting Guide...
copy "..\wiki-content\Troubleshooting-CLEAN.md" "Troubleshooting.md" >nul
if errorlevel 1 echo WARNING: Could not update Troubleshooting.md

echo Updating Architecture Overview...
copy "..\wiki-content\Architecture-Overview-CLEAN.md" "Architecture-Overview.md" >nul
if errorlevel 1 echo WARNING: Could not update Architecture-Overview.md

echo Updating Development Setup...
copy "..\wiki-content\Development-Setup-CLEAN.md" "Development-Setup.md" >nul
if errorlevel 1 echo WARNING: Could not update Development-Setup.md

echo Updating Contributing Guide...
copy "..\wiki-content\Contributing-CLEAN.md" "Contributing.md" >nul
if errorlevel 1 echo WARNING: Could not update Contributing.md

echo.
echo Committing changes to Wiki...

:: Add all changes
git add .

:: Check if there are changes to commit
git diff --staged --quiet
if errorlevel 1 (
    :: There are changes to commit
    git commit -m "Update all wiki pages with clean professional content - removed emojis and personal attribution"
    
    echo.
    echo Pushing changes to GitHub...
    git push
    
    if errorlevel 1 (
        echo.
        echo ERROR: Failed to push changes to GitHub
        echo This might be due to:
        echo - Network connectivity issues
        echo - Authentication problems
        echo - Repository access permissions
        echo.
        echo You can try pushing manually:
        echo cd BookletDC.wiki
        echo git push
    ) else (
        echo.
        echo ============================================
        echo    SUCCESS! Wiki pages updated!
        echo ============================================
        echo.
        echo Your GitHub Wiki has been updated with:
        echo - Clean, professional content
        echo - No emojis
        echo - Proper NMIMS attribution
        echo - No personal attribution
        echo.
        echo Visit your wiki at:
        echo https://github.com/sunny-nanade/BookletDC/wiki
    )
) else (
    echo.
    echo No changes detected in wiki content.
    echo Wiki pages are already up to date.
)

echo.
cd..
echo Returning to main project directory...
echo.
pause
