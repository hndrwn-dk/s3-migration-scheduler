Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Windows Build - No Icons (Quick Fix)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in electron-app directory
if (!(Test-Path "package.json")) {
    Write-Host "[ERROR] Run this from electron-app directory!" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    # Step 1: Backup package.json
    Write-Host "[INFO] Step 1: Backing up package.json..." -ForegroundColor Green
    Copy-Item "package.json" "package.json.iconbackup"

    # Step 2: Remove icon references
    Write-Host "[INFO] Step 2: Temporarily removing icon references..." -ForegroundColor Green
    $content = Get-Content "package.json" | Where-Object { 
        $_ -notmatch '"icon":' -and 
        $_ -notmatch '"installerIcon":' -and 
        $_ -notmatch '"uninstallerIcon":' -and 
        $_ -notmatch '"installerHeaderIcon":'
    }
    $content | Set-Content "package.json"

    # Step 3: Build without icons
    Write-Host "[INFO] Step 3: Building Windows application (no custom icons)..." -ForegroundColor Green
    Write-Host "[INFO] This will take 5-10 minutes..." -ForegroundColor Yellow
    
    $buildResult = npx electron-builder --win
    $buildExitCode = $LASTEXITCODE

    # Step 4: Check results
    if ($buildExitCode -eq 0) {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host "🎉 BUILD SUCCESSFUL! 🎉" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your Windows application is ready in: dist\" -ForegroundColor Green
        Write-Host ""
        
        $exeFiles = Get-ChildItem "dist\*.exe" -ErrorAction SilentlyContinue
        if ($exeFiles) {
            Write-Host "📦 Generated files:" -ForegroundColor Cyan
            foreach ($file in $exeFiles) {
                Write-Host "   $($file.Name)" -ForegroundColor White
            }
            Write-Host ""
            Write-Host "✅ Your app packages are ready to distribute!" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "Note: Using default Electron icons (custom icons can be added later)" -ForegroundColor Yellow
        Write-Host ""
    } else {
        throw "Build process failed"
    }

} catch {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host "❌ BUILD FAILED ❌" -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
} finally {
    # Always restore original package.json
    if (Test-Path "package.json.iconbackup") {
        Write-Host "[INFO] Restoring original package.json..." -ForegroundColor Yellow
        Copy-Item "package.json.iconbackup" "package.json"
        Remove-Item "package.json.iconbackup"
    }
}

Read-Host "Press Enter to exit"