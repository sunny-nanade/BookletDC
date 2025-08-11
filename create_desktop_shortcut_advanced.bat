@echo off
REM ================================================================
REM  Booklet Scanner - Advanced Desktop Shortcut Creator
REM  Creates a high-quality desktop shortcut with custom icon
REM ================================================================

echo Creating desktop shortcut for Booklet Scanner...

REM Get current directory (where this script is located)
set "APP_DIR=%~dp0"
set "START_BAT=%APP_DIR%start.bat"
set "LOGO_PNG=%APP_DIR%assets\nmims.png"
set "LOGO_ICO=%APP_DIR%assets\nmims.ico"

REM Create PowerShell script for advanced icon conversion and shortcut creation
set "PS_SCRIPT=%TEMP%\create_advanced_shortcut.ps1"

echo # Advanced PNG to ICO conversion with multiple sizes > "%PS_SCRIPT%"
echo if (-not (Test-Path "%LOGO_ICO%") -and (Test-Path "%LOGO_PNG%")) { >> "%PS_SCRIPT%"
echo     try { >> "%PS_SCRIPT%"
echo         Add-Type -AssemblyName System.Drawing >> "%PS_SCRIPT%"
echo         Add-Type -AssemblyName System.Windows.Forms >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         # Load the original PNG >> "%PS_SCRIPT%"
echo         $originalImage = [System.Drawing.Image]::FromFile("%LOGO_PNG%") >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         # Create multiple icon sizes for better quality >> "%PS_SCRIPT%"
echo         $sizes = @(16, 32, 48, 64, 128, 256) >> "%PS_SCRIPT%"
echo         $memoryStream = New-Object System.IO.MemoryStream >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         # Create ICO file with multiple resolutions >> "%PS_SCRIPT%"
echo         $iconWriter = New-Object System.IO.BinaryWriter($memoryStream) >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         # ICO file header >> "%PS_SCRIPT%"
echo         $iconWriter.Write([uint16]0)        # Reserved >> "%PS_SCRIPT%"
echo         $iconWriter.Write([uint16]1)        # Image type (1 = ICO) >> "%PS_SCRIPT%"
echo         $iconWriter.Write([uint16]$sizes.Count) # Number of images >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         $imageDataList = @() >> "%PS_SCRIPT%"
echo         $offset = 6 + (16 * $sizes.Count) >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         foreach ($size in $sizes) { >> "%PS_SCRIPT%"
echo             # Resize image >> "%PS_SCRIPT%"
echo             $resizedImage = New-Object System.Drawing.Bitmap($originalImage, $size, $size) >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo             # Convert to PNG format in memory >> "%PS_SCRIPT%"
echo             $imageStream = New-Object System.IO.MemoryStream >> "%PS_SCRIPT%"
echo             $resizedImage.Save($imageStream, [System.Drawing.Imaging.ImageFormat]::Png) >> "%PS_SCRIPT%"
echo             $imageData = $imageStream.ToArray() >> "%PS_SCRIPT%"
echo             $imageDataList += ,$imageData >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo             # Write directory entry >> "%PS_SCRIPT%"
echo             $iconWriter.Write([byte]($size -eq 256 ? 0 : $size)) # Width >> "%PS_SCRIPT%"
echo             $iconWriter.Write([byte]($size -eq 256 ? 0 : $size)) # Height >> "%PS_SCRIPT%"
echo             $iconWriter.Write([byte]0)       # Color palette >> "%PS_SCRIPT%"
echo             $iconWriter.Write([byte]0)       # Reserved >> "%PS_SCRIPT%"
echo             $iconWriter.Write([uint16]1)     # Color planes >> "%PS_SCRIPT%"
echo             $iconWriter.Write([uint16]32)    # Bits per pixel >> "%PS_SCRIPT%"
echo             $iconWriter.Write([uint32]$imageData.Length) # Image data size >> "%PS_SCRIPT%"
echo             $iconWriter.Write([uint32]$offset) # Offset to image data >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo             $offset += $imageData.Length >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo             $resizedImage.Dispose() >> "%PS_SCRIPT%"
echo             $imageStream.Dispose() >> "%PS_SCRIPT%"
echo         } >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         # Write image data >> "%PS_SCRIPT%"
echo         foreach ($imageData in $imageDataList) { >> "%PS_SCRIPT%"
echo             $iconWriter.Write($imageData) >> "%PS_SCRIPT%"
echo         } >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         # Save to file >> "%PS_SCRIPT%"
echo         [System.IO.File]::WriteAllBytes("%LOGO_ICO%", $memoryStream.ToArray()) >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         # Cleanup >> "%PS_SCRIPT%"
echo         $originalImage.Dispose() >> "%PS_SCRIPT%"
echo         $iconWriter.Dispose() >> "%PS_SCRIPT%"
echo         $memoryStream.Dispose() >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo         Write-Host "[INFO] High-quality multi-resolution icon created" >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo     } catch { >> "%PS_SCRIPT%"
echo         # Fallback to simple conversion >> "%PS_SCRIPT%"
echo         try { >> "%PS_SCRIPT%"
echo             $png = [System.Drawing.Image]::FromFile("%LOGO_PNG%") >> "%PS_SCRIPT%"
echo             $ico = New-Object System.Drawing.Bitmap($png, 32, 32) >> "%PS_SCRIPT%"
echo             $ico.Save("%LOGO_ICO%", [System.Drawing.Imaging.ImageFormat]::Icon) >> "%PS_SCRIPT%"
echo             $png.Dispose() >> "%PS_SCRIPT%"
echo             $ico.Dispose() >> "%PS_SCRIPT%"
echo             Write-Host "[INFO] Standard icon created (fallback method)" >> "%PS_SCRIPT%"
echo         } catch { >> "%PS_SCRIPT%"
echo             Write-Host "[WARNING] Could not convert logo to ICO format: $_" >> "%PS_SCRIPT%"
echo         } >> "%PS_SCRIPT%"
echo     } >> "%PS_SCRIPT%"
echo } elseif (Test-Path "%LOGO_ICO%") { >> "%PS_SCRIPT%"
echo     Write-Host "[INFO] Using existing ICO file" >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"
echo. >> "%PS_SCRIPT%"
echo # Create the shortcut >> "%PS_SCRIPT%"
echo $WshShell = New-Object -comObject WScript.Shell >> "%PS_SCRIPT%"
echo $Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Booklet Scanner.lnk") >> "%PS_SCRIPT%"
echo $Shortcut.TargetPath = "%START_BAT%" >> "%PS_SCRIPT%"
echo $Shortcut.WorkingDirectory = "%APP_DIR%" >> "%PS_SCRIPT%"
echo $Shortcut.Description = "Booklet Scanner - Document Scanning Application by NMIMS" >> "%PS_SCRIPT%"
echo # Use custom icon if available, otherwise use default >> "%PS_SCRIPT%"
echo if (Test-Path "%LOGO_ICO%") { >> "%PS_SCRIPT%"
echo     $Shortcut.IconLocation = "%LOGO_ICO%" >> "%PS_SCRIPT%"
echo     Write-Host "[INFO] Using custom NMIMS logo as shortcut icon" >> "%PS_SCRIPT%"
echo } else { >> "%PS_SCRIPT%"
echo     $Shortcut.IconLocation = "%START_BAT%,0" >> "%PS_SCRIPT%"
echo     Write-Host "[INFO] Using default icon" >> "%PS_SCRIPT%"
echo } >> "%PS_SCRIPT%"
echo $Shortcut.Save() >> "%PS_SCRIPT%"

REM Execute PowerShell script
powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"

REM Cleanup
del "%PS_SCRIPT%"

if exist "%USERPROFILE%\Desktop\Booklet Scanner.lnk" (
    echo.
    echo ================================================================
    echo  SUCCESS! Desktop shortcut created successfully!
    echo ================================================================
    echo.
    echo A "Booklet Scanner" shortcut with NMIMS logo has been placed
    echo on your desktop. Double-click it anytime to start the application.
    echo.
    echo Icon source: %LOGO_PNG%
    echo Icon file: %LOGO_ICO%
    echo.
) else (
    echo.
    echo ================================================================
    echo  ERROR: Failed to create desktop shortcut
    echo ================================================================
    echo.
    echo Please run this script as Administrator if the shortcut
    echo was not created successfully.
    echo.
)

pause
