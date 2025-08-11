# GitHub Wiki Content Display Helper
# Run this to see content for copying to GitHub Wiki

Write-Host "========================================" -ForegroundColor Green
Write-Host "GitHub Wiki Content Helper" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/sunny-nanade/BookletDC" -ForegroundColor White
Write-Host "2. Settings -> Features -> Enable 'Wikis'" -ForegroundColor White
Write-Host "3. Wiki tab -> Create first page" -ForegroundColor White
Write-Host "4. Copy content from sections below" -ForegroundColor White
Write-Host ""

$wikiFiles = @(
    @{Name="Home"; File="Home.md"},
    @{Name="Installation-Guide"; File="Installation-Guide.md"},
    @{Name="Quick-Start"; File="Quick-Start.md"},
    @{Name="Troubleshooting"; File="Troubleshooting.md"},
    @{Name="Architecture-Overview"; File="Architecture-Overview.md"},
    @{Name="Development-Setup"; File="Development-Setup.md"},
    @{Name="Contributing-Guide"; File="Contributing-Guide.md"}
)

foreach ($wiki in $wikiFiles) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "PAGE NAME: $($wiki.Name)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $filePath = "wiki-content\$($wiki.File)"
    if (Test-Path $filePath) {
        Get-Content $filePath
    } else {
        Write-Host "File not found: $filePath" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Press any key for next page..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Clear-Host
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "Wiki Content Display Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Enable Wiki on GitHub" -ForegroundColor White
Write-Host "2. Create pages with the exact names shown" -ForegroundColor White
Write-Host "3. Copy and paste the content for each page" -ForegroundColor White
Write-Host ""
