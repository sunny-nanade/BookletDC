# Wiki Link Fix Instructions
Write-Host "========================================" -ForegroundColor Red
Write-Host "WIKI LINK FIXES NEEDED" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

Write-Host "PROBLEM IDENTIFIED:" -ForegroundColor Yellow
Write-Host "- GitHub Wiki converts hyphens in page names to en-dashes (‐)" -ForegroundColor White
Write-Host "- Some links in navigation are pointing to non-existent pages" -ForegroundColor White
Write-Host "- Home page needs to be updated with correct links" -ForegroundColor White
Write-Host ""

Write-Host "CURRENT WIKI PAGES (from GitHub):" -ForegroundColor Cyan
Write-Host "✅ Architecture‐Overview (note: en-dash ‐)" -ForegroundColor Green
Write-Host "✅ Contributing‐Guide (note: en-dash ‐)" -ForegroundColor Green  
Write-Host "✅ Development‐Setup (note: en-dash ‐)" -ForegroundColor Green
Write-Host "✅ Installation-Guide (regular dash -)" -ForegroundColor Green
Write-Host "✅ Quick-Start (regular dash -)" -ForegroundColor Green
Write-Host "✅ README‐WIKI‐SETUP (note: en-dashes ‐)" -ForegroundColor Green
Write-Host "✅ Troubleshooting (single word)" -ForegroundColor Green
Write-Host ""

Write-Host "PAGES MISSING (linked but don't exist):" -ForegroundColor Red
Write-Host "❌ System-Requirements" -ForegroundColor Red
Write-Host "❌ User-Guide" -ForegroundColor Red
Write-Host "❌ QR-Code-Features" -ForegroundColor Red
Write-Host "❌ PDF-Generation" -ForegroundColor Red
Write-Host "❌ Settings-Configuration" -ForegroundColor Red
Write-Host "❌ API-Documentation" -ForegroundColor Red
Write-Host "❌ Environment-Compatibility" -ForegroundColor Red
Write-Host "❌ Deployment-Options" -ForegroundColor Red
Write-Host "❌ Performance-Optimization" -ForegroundColor Red
Write-Host "❌ Security-Considerations" -ForegroundColor Red
Write-Host "❌ Code-Standards" -ForegroundColor Red
Write-Host "❌ Testing-Guidelines" -ForegroundColor Red
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "SOLUTION OPTIONS:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "OPTION 1: Update Home Page (Quick Fix)" -ForegroundColor Yellow
Write-Host "Replace Home page content with the fixed version that only links to existing pages" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 2: Create Missing Pages (Complete Fix)" -ForegroundColor Yellow  
Write-Host "Create the missing pages that are referenced in the navigation" -ForegroundColor White
Write-Host ""

Write-Host "OPTION 3: Simplified Navigation (Recommended)" -ForegroundColor Yellow
Write-Host "Use a simplified Home page that only shows available pages" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "IMMEDIATE ACTION NEEDED:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. REPLACE HOME PAGE CONTENT" -ForegroundColor White
Write-Host "   Copy content from: wiki-content\Home-FIXED.md" -ForegroundColor Gray
Write-Host "   Paste into: https://github.com/sunny-nanade/BookletDC/wiki/Home" -ForegroundColor Gray
Write-Host ""

Write-Host "2. ADD PAGE INDEX (Optional)" -ForegroundColor White  
Write-Host "   Create new page: 'Page-Index'" -ForegroundColor Gray
Write-Host "   Copy content from: wiki-content\Page-Index.md" -ForegroundColor Gray
Write-Host ""

Write-Host "3. VERIFY LINKS" -ForegroundColor White
Write-Host "   Test all links in the updated Home page" -ForegroundColor Gray
Write-Host "   All should work with existing pages" -ForegroundColor Gray
Write-Host ""

Write-Host "Press any key to view the fixed Home page content..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "FIXED HOME PAGE CONTENT:" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Get-Content "wiki-content\Home-FIXED.md"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "COPY THE ABOVE CONTENT TO HOME PAGE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
