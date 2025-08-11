# PowerShell script for cleaner server management
# Better handling of Ctrl+C and cleanup

Write-Host "Starting Booklet Scanner Application..." -ForegroundColor Green
Write-Host ""

# Check Python installation
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = py --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $pythonCmd = "py"
        Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
    } else {
        $pythonVersion = python --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = "python"
            Write-Host "Found Python: $pythonVersion" -ForegroundColor Green
        } else {
            throw "Python not found"
        }
    }
} catch {
    Write-Host "Error: Python is not installed or not accessible" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Setting up virtual environment..." -ForegroundColor Yellow
if (!(Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    & $pythonCmd -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Cyan
& "venv\Scripts\Activate.ps1"

Write-Host "Installing/updating dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt

Write-Host ""
Write-Host "Starting Booklet Scanner Application..." -ForegroundColor Green
Write-Host "Opening browser at: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host ""

# Open browser after a short delay
Start-Job -ScriptBlock {
    Start-Sleep 3
    Start-Process "http://127.0.0.1:8000"
} | Out-Null

Write-Host "============================================" -ForegroundColor Yellow
Write-Host " Server Controls:" -ForegroundColor White
Write-Host " • Browser will open automatically" -ForegroundColor White
Write-Host " • Press Ctrl+C to stop the server" -ForegroundColor White
Write-Host " • Window will close automatically" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Yellow
Write-Host ""

# Setup cleanup on exit
$cleanup = {
    Write-Host ""
    Write-Host "Cleaning up..." -ForegroundColor Yellow
    
    # Stop uvicorn processes
    Get-Process | Where-Object {$_.ProcessName -like "*python*" -or $_.ProcessName -like "*uvicorn*"} | 
        Where-Object {$_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*backend.main*"} | 
        Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "Server stopped successfully!" -ForegroundColor Green
    Start-Sleep 1
}

# Register cleanup function
Register-EngineEvent PowerShell.Exiting -Action $cleanup

try {
    # Start the server
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
} catch {
    Write-Host "Server stopped." -ForegroundColor Yellow
} finally {
    & $cleanup
}