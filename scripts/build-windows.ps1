# S3 Migration Scheduler - Windows Build Script (PowerShell)
param(
    [switch]$SkipDependencies = $false
)

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " S3 Migration Scheduler - Windows Build Script (PowerShell)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "client")) {
    Write-Host "[ERROR] Client directory not found. Please run from project root." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "electron-app")) {
    Write-Host "[ERROR] Electron-app directory not found. Please run from project root." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check Node.js
Write-Host "[INFO] Checking Node.js..." -ForegroundColor Green
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js 16+ from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check npm
Write-Host "[INFO] Checking npm..." -ForegroundColor Green
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] npm not found." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

if (-not $SkipDependencies) {
    # Install root dependencies
    Write-Host "[INFO] Step 1: Installing root dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install root dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    # Install client dependencies
    Write-Host ""
    Write-Host "[INFO] Step 2: Installing client dependencies..." -ForegroundColor Yellow
    Set-Location client
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install client dependencies" -ForegroundColor Red
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
    Set-Location ..
    
    # Install electron dependencies
    Write-Host ""
    Write-Host "[INFO] Step 3: Installing Electron dependencies..." -ForegroundColor Yellow
    Set-Location electron-app
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to install electron dependencies" -ForegroundColor Red
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
    Set-Location ..
}

# Build React frontend
Write-Host ""
Write-Host "[INFO] Step 4: Building React frontend..." -ForegroundColor Yellow
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Frontend build failed" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

# Copy frontend to Electron app
Write-Host ""
Write-Host "[INFO] Step 5: Copying frontend to Electron app..." -ForegroundColor Yellow
if (Test-Path "electron-app\build") {
    Remove-Item -Recurse -Force "electron-app\build"
}
Copy-Item -Recurse "client\build" "electron-app\build"

# Build Electron application
Write-Host ""
Write-Host "[INFO] Step 6: Building Windows application..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Yellow
Set-Location electron-app
npx electron-builder --win
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Electron build failed" -ForegroundColor Red
    Set-Location ..
    Read-Host "Press Enter to exit"
    exit 1
}
Set-Location ..

# Check results
Write-Host ""
Write-Host "[INFO] Step 7: Checking build results..." -ForegroundColor Yellow

if (Test-Path "electron-app\dist") {
    Write-Host "[SUCCESS] Build completed! Generated files:" -ForegroundColor Green
    Get-ChildItem "electron-app\dist" | ForEach-Object { Write-Host "  - $($_.Name)" -ForegroundColor Green }
    
    Write-Host ""
    Write-Host "[INFO] Copying files to main dist directory..." -ForegroundColor Yellow
    if (-not (Test-Path "dist")) {
        New-Item -ItemType Directory -Path "dist" | Out-Null
    }
    Copy-Item "electron-app\dist\*" "dist\" -Recurse -Force
    
    Write-Host ""
    Write-Host "[SUCCESS] Windows application packages created in dist\ directory:" -ForegroundColor Green
    Get-ChildItem "dist" -Filter "*.exe" | ForEach-Object { 
        $size = [math]::Round($_.Length / 1MB, 1)
        Write-Host "  - $($_.Name) ($size MB)" -ForegroundColor Green 
    }
} else {
    Write-Host "[ERROR] No build output found in electron-app\dist" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " BUILD PROCESS COMPLETED!" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your Windows application packages are ready in the dist\ folder!" -ForegroundColor Green
Write-Host ""

# List final results
if (Test-Path "dist\*.exe") {
    Write-Host "Generated packages:" -ForegroundColor Green
    Get-ChildItem "dist" -Filter "*.exe" | ForEach-Object { 
        $size = [math]::Round($_.Length / 1MB, 1)
        Write-Host "  📦 $($_.Name) ($size MB)" -ForegroundColor Cyan
    }
    Write-Host ""
    Write-Host "🎉 Success! Your Windows application is ready for distribution!" -ForegroundColor Green
}

Read-Host "Press Enter to exit"