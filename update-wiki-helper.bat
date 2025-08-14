@echo off
echo ============================================
echo    GitHub Wiki Update Helper
echo ============================================
echo.
echo This script will help you update your GitHub Wiki pages.
echo.
echo STEP 1: Clone your Wiki repository
echo ----------------------------------------
echo Run this command in a new folder:
echo git clone https://github.com/sunny-nanade/BookletDC.wiki.git
echo.
echo STEP 2: Copy the clean content files
echo ----------------------------------------
echo Copy these files from wiki-content\ to your wiki folder:
echo.
echo - Installation-Guide-CLEAN.md  →  Installation-Guide.md
echo - Quick-Start-CLEAN.md         →  Quick-Start.md  
echo - Troubleshooting-CLEAN.md     →  Troubleshooting.md
echo - Architecture-Overview-CLEAN.md → Architecture-Overview.md
echo - Development-Setup-CLEAN.md   →  Development-Setup.md
echo - Contributing-CLEAN.md        →  Contributing.md
echo.
echo STEP 3: Commit and push changes
echo ----------------------------------------
echo cd BookletDC.wiki
echo git add .
echo git commit -m "Update all wiki pages with clean professional content"
echo git push
echo.
echo ============================================
echo Your Wiki will be updated automatically!
echo ============================================
pause
