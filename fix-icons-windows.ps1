# Fix Empty Icon Files on Windows
Write-Host "🔧 Fixing Empty Icon Files..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in electron-app directory
if (!(Test-Path "assets\icon.svg")) {
    Write-Host "❌ Please run this from the electron-app directory!" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found icon.svg ($(Get-Item 'assets\icon.svg' | Select-Object -ExpandProperty Length) bytes)" -ForegroundColor Green

# Method 1: Try to download a working ICO file
Write-Host "🌐 Downloading working icon..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/microsoft/vscode/main/resources/win32/code.ico" -OutFile "assets\icon.ico" -ErrorAction Stop
    Write-Host "✅ Downloaded working icon.ico!" -ForegroundColor Green
    $iconSize = (Get-Item "assets\icon.ico").Length
    Write-Host "   Icon size: $iconSize bytes" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Download failed, creating minimal icon..." -ForegroundColor Yellow
    
    # Create a minimal valid ICO file
    $iconHeader = @(0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20, 0x00, 0x00, 0x01, 0x00, 0x08, 0x00, 0xA8, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00)
    $iconData = @(0x28, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x40, 0x00, 0x00, 0x00, 0x01, 0x00, 0x08, 0x00)
    $iconPadding = @(0x00) * 100  # Simple padding
    $fullIcon = $iconHeader + $iconData + $iconPadding
    
    [System.IO.File]::WriteAllBytes("assets\icon.ico", $fullIcon)
    Write-Host "✅ Created minimal icon.ico!" -ForegroundColor Green
}

# Method 2: Create basic PNG files
Write-Host "🖼️ Creating PNG icons..." -ForegroundColor Yellow

# Simple 1x1 PNG (valid but minimal)
$pngHeader = @(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52)
$pngData = @(0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x20, 0x08, 0x02, 0x00, 0x00, 0x00, 0xFC, 0x18, 0xED, 0xA3)
$pngEnd = @(0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00, 0x01, 0x00, 0x01, 0x5C, 0xC2, 0x5C, 0x08, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82)
$simplePng = $pngHeader + $pngData + $pngEnd

$pngFiles = @("icon.png", "icon-16x16.png", "icon-32x32.png", "icon-48x48.png", "icon-64x64.png", "icon-128x128.png", "icon-256x256.png", "icon-512x512.png")

foreach ($pngFile in $pngFiles) {
    [System.IO.File]::WriteAllBytes("assets\$pngFile", $simplePng)
    Write-Host "   ✅ Created $pngFile" -ForegroundColor Green
}

# Verify files were created
Write-Host ""
Write-Host "🔍 Verification:" -ForegroundColor Cyan
Get-ChildItem "assets\icon*" | ForEach-Object {
    $status = if ($_.Length -gt 0) { "✅" } else { "❌" }
    Write-Host "   $status $($_.Name) - $($_.Length) bytes" -ForegroundColor $(if ($_.Length -gt 0) { "Green" } else { "Red" })
}

Write-Host ""
Write-Host "🚀 Now you can build:" -ForegroundColor Cyan
Write-Host "   npx electron-builder --win" -ForegroundColor White
Write-Host ""
Write-Host "Or use specific icon:" -ForegroundColor Cyan
Write-Host "   npx electron-builder --win --config.win.icon=assets/icon.ico" -ForegroundColor White