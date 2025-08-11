# PowerShell script to start Booklet Scanner Application
Write-Host "Starting Booklet Scanner Application..." -ForegroundColor Green
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Check Python installation
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonCmd = $null

if (Test-Command "py") {
    $pythonCmd = "py"
    $version = py --version 2>&1
    Write-Host "Found Python via py launcher: $version" -ForegroundColor Green
} elseif (Test-Command "python") {
    $pythonCmd = "python"
    $version = python --version 2>&1
    Write-Host "Found Python: $version" -ForegroundColor Green
} elseif (Test-Command "python3") {
    $pythonCmd = "python3"
    $version = python3 --version 2>&1
    Write-Host "Found Python3: $version" -ForegroundColor Green
} else {
    Write-Host "Error: Python is not installed or not accessible" -ForegroundColor Red
    Write-Host "Please install Python from https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Setting up virtual environment..." -ForegroundColor Yellow

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    & $pythonCmd -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create virtual environment" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Cyan
$activateScript = ".\venv\Scripts\Activate.ps1"

if (Test-Path $activateScript) {
    & $activateScript
} else {
    Write-Host "Virtual environment activation script not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install/update dependencies
Write-Host "Installing/updating dependencies..." -ForegroundColor Cyan
pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting FastAPI server..." -ForegroundColor Green
Write-Host "The application will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Change to backend directory and start the server
Set-Location backend
& $pythonCmd main.py

# Cleanup
Write-Host ""
Write-Host "Server stopped. Cleaning up..." -ForegroundColor Yellow
Set-Location ..
deactivate
Write-Host "Done!" -ForegroundColor Green
Read-Host "Press Enter to exit"
