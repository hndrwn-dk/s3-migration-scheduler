Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Complete Windows Build (SQLite-Free)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "[ERROR] Not in project root! Please run from s3-migration-scheduler directory" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 1: Go to electron-app directory
Write-Host "[INFO] Step 1: Navigating to electron-app directory..." -ForegroundColor Green
Set-Location electron-app
if (!(Test-Path "package.json")) {
    Write-Host "[ERROR] electron-app/package.json not found!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    # Step 2: Backup original package.json
    Write-Host "[INFO] Step 2: Backing up original package.json..." -ForegroundColor Green
    if (Test-Path "package.json.backup") { Remove-Item "package.json.backup" }
    Copy-Item "package.json" "package.json.backup"

    # Step 3: Create SQLite-free package.json
    Write-Host "[INFO] Step 3: Creating SQLite-free package.json..." -ForegroundColor Green
    $packageContent = Get-Content "package.json" | Where-Object { $_ -notmatch "better-sqlite3" }
    $packageContent = $packageContent -replace ',(\s*})', '$1'  # Remove trailing commas
    $packageContent | Set-Content "package.json"

    # Step 4: Complete cleanup
    Write-Host "[INFO] Step 4: Complete cleanup (node_modules, package-lock, cache)..." -ForegroundColor Yellow
    if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
    if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" }
    if (Test-Path "dist") { Remove-Item "dist" -Recurse -Force }
    npm cache clean --force | Out-Null

    # Step 5: Fresh install
    Write-Host "[INFO] Step 5: Fresh installation of dependencies..." -ForegroundColor Green
    $installResult = npm install
    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }

    # Step 6: Verify no SQLite in node_modules
    Write-Host "[INFO] Step 6: Verifying SQLite removal..." -ForegroundColor Green
    if (Test-Path "node_modules\better-sqlite3") {
        Write-Host "[WARNING] better-sqlite3 still exists, removing manually..." -ForegroundColor Yellow
        Remove-Item "node_modules\better-sqlite3" -Recurse -Force
    }

    # Step 7: Copy frontend build
    Write-Host "[INFO] Step 7: Ensuring frontend build is available..." -ForegroundColor Green
    if (!(Test-Path "build")) {
        if (Test-Path "..\client\build") {
            Write-Host "[INFO] Copying frontend build..." -ForegroundColor Green
            Copy-Item "..\client\build" "build" -Recurse
        } else {
            throw "Frontend build not found! Please build client first"
        }
    }

    # Step 8: Build Windows application
    Write-Host "[INFO] Step 8: Building Windows application..." -ForegroundColor Green
    Write-Host "[INFO] This will take 5-10 minutes..." -ForegroundColor Yellow
    
    # Use --config.npmRebuild=false to prevent SQLite rebuild
    $buildResult = npx electron-builder --win --config.npmRebuild=false
    $buildExitCode = $LASTEXITCODE

    # Step 9: Check results
    if ($buildExitCode -eq 0) {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host "🎉 BUILD SUCCESSFUL! 🎉" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your Windows application is ready in: electron-app\dist\" -ForegroundColor Green
        Write-Host ""
        
        $exeFiles = Get-ChildItem "dist\*.exe" -ErrorAction SilentlyContinue
        if ($exeFiles) {
            Write-Host "📦 Generated files:" -ForegroundColor Cyan
            foreach ($file in $exeFiles) {
                Write-Host "   $($file.Name)" -ForegroundColor White
            }
            Write-Host ""
            Write-Host "✅ Professional installer: *Setup*.exe" -ForegroundColor Green
            Write-Host "✅ Portable application: *.exe (without 'Setup')" -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "You can now distribute these .exe files to Windows users!" -ForegroundColor Green
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
    
    # Restore original package.json
    if (Test-Path "package.json.backup") {
        Write-Host "[INFO] Restoring original package.json..." -ForegroundColor Yellow
        Copy-Item "package.json.backup" "package.json"
    }
    
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 10: Restore original package.json
Write-Host "[INFO] Restoring original package.json..." -ForegroundColor Green
if (Test-Path "package.json.backup") {
    Copy-Item "package.json.backup" "package.json"
    Remove-Item "package.json.backup"
}

Read-Host "Press Enter to exit"