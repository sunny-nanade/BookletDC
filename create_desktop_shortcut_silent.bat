@echo off
REM ================================================================
REM  Booklet Scanner - Silent Desktop Shortcut Creator
REM  Creates a desktop shortcut without user interaction
REM ================================================================

REM Get current directory (where this script is located)
set "APP_DIR=%~dp0"
set "START_BAT=%APP_DIR%start.bat"
set "LOGO_PNG=%APP_DIR%assets\nmims.png"
set "LOGO_ICO=%APP_DIR%assets\nmims.ico"

REM Create PowerShell script to convert PNG to ICO and generate shortcut
set "PS_SCRIPT=%TEMP%\create_shortcut_silent.ps1"

echo # Convert PNG to ICO if needed > "%PS_SCRIPT%"
echo if (-not (Test-Path "%LOGO_ICO%") -and (Test-Path "%LOGO_PNG%")) { >> "%PS_SCRIPT%"
echo     try { >> "%PS_SCRIPT%"
echo         Add-Type -AssemblyName System.Drawing >> "%PS_SCRIPT%"
echo         $png = [System.Drawing.Image]::FromFile("%LOGO_PNG%") >> "%PS_SCRIPT%"
echo         $ico = New-Object System.Drawing.Bitmap($png, 32, 32) >> "%PS_SCRIPT%"
echo         $ico.Save("%LOGO_ICO%", [System.Drawing.Imaging.ImageFormat]::Icon) >> "%PS_SCRIPT%"
echo         $png.Dispose() >> "%PS_SCRIPT%"
echo         $ico.Dispose() >> "%PS_SCRIPT%"
echo     } catch { >> "%PS_SCRIPT%"
echo         # Silent failure >> "%PS_SCRIPT%"
echo     } >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo # Create the shortcut >> "%PS_SCRIPT%"
echo $WshShell = New-Object -comObject WScript.Shell >> "%PS_SCRIPT%"
echo $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Booklet Scanner.lnk") >> "%PS_SCRIPT%"
echo $Shortcut.TargetPath = "%START_BAT%" >> "%PS_SCRIPT%"
echo $Shortcut.WorkingDirectory = "%APP_DIR%" >> "%PS_SCRIPT%"
echo $Shortcut.Description = "Booklet Scanner - Document Scanning Application" >> "%PS_SCRIPT%"
echo # Use custom icon if available, otherwise use default >> "%PS_SCRIPT%"
echo if (Test-Path "%LOGO_ICO%") { >> "%PS_SCRIPT%"
echo     $Shortcut.IconLocation = "%LOGO_ICO%" >> "%PS_SCRIPT%"
echo } else { >> "%PS_SCRIPT%"
echo     $Shortcut.IconLocation = "%START_BAT%,0" >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"
echo $Shortcut.Save() >> "%PS_SCRIPT%"

REM Execute PowerShell script silently
powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%" >nul 2>&1

REM Cleanup
del "%PS_SCRIPT%" >nul 2>&1

REM Exit silently without pause
exit /b 0
