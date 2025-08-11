# Phase 1 Cleanup Script
# Removes unwanted files and empty directories

Write-Host "🧹 Phase 1 Cleanup Starting..." -ForegroundColor Green

# Remove test files
if (Test-Path "test.html") {
    Remove-Item "test.html" -Force
    Write-Host "✅ Removed test.html" -ForegroundColor Yellow
}

# Remove duplicate files
if (Test-Path "venvX") {
    Remove-Item "venvX" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Removed venvX directory" -ForegroundColor Yellow
}

if (Test-Path "requirements.txtX") {
    Remove-Item "requirements.txtX" -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Removed requirements.txtX" -ForegroundColor Yellow
}

# Remove empty directories
if (Test-Path "frontend\templates" -and (Get-ChildItem "frontend\templates" -Force | Measure-Object).Count -eq 0) {
    Remove-Item "frontend\templates" -Force
    Write-Host "✅ Removed empty templates directory" -ForegroundColor Yellow
}

if (Test-Path "frontend\static\lib" -and (Get-ChildItem "frontend\static\lib" -Force | Measure-Object).Count -eq 0) {
    Remove-Item "frontend\static\lib" -Force
    Write-Host "✅ Removed empty lib directory" -ForegroundColor Yellow
}

Write-Host "🎉 Phase 1 Cleanup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Final Structure:" -ForegroundColor Cyan
Write-Host "├── index.html (modular, ~100 lines)" -ForegroundColor White
Write-Host "├── frontend/static/css/ (5 modular CSS files)" -ForegroundColor White
Write-Host "├── frontend/static/js/ (5 modular JS files)" -ForegroundColor White
Write-Host "├── backend/ (API and settings)" -ForegroundColor White
Write-Host "└── start.bat (auto-opens browser)" -ForegroundColor White