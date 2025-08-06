# 🔧 Windows Build Troubleshooting Guide

## 🚨 **Issue: Build Script Stops Early**

### **Your Error:**
```
PS C:\Users\hendr\Deployment\s3-migration-scheduler\scripts> .\build-windows.bat     

================================================================
 S3 Migration Scheduler - Windows Build Script
================================================================

[92m[INFO][0m

nothing dist\
```

---

## 🎯 **Quick Fix Steps**

### **Step 1: Run Debug Script**
```powershell
# First, try the debug version to see what's failing:
PS C:\Users\hendr\Deployment\s3-migration-scheduler\scripts> .\build-windows-debug.bat
```

### **Step 2: Check Your Location**
```powershell
# Make sure you're in the project root:
PS C:\Users\hendr\Deployment\s3-migration-scheduler> pwd
# Should show: C:\Users\hendr\Deployment\s3-migration-scheduler

# Check if required directories exist:
PS C:\Users\hendr\Deployment\s3-migration-scheduler> dir
# Should see: client, server, electron-app, scripts folders
```

### **Step 3: Install Dependencies First**
```powershell
# Install root dependencies
PS C:\Users\hendr\Deployment\s3-migration-scheduler> npm install

# Install client dependencies
PS C:\Users\hendr\Deployment\s3-migration-scheduler> cd client
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> npm install

# Install electron dependencies  
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> cd ..\electron-app
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> npm install

# Go back to root
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> cd ..
```

### **Step 4: Manual Build Process**
```powershell
# If automatic script fails, try manual build:

# 1. Build frontend first
PS C:\Users\hendr\Deployment\s3-migration-scheduler> cd client
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> npm run build

# 2. Copy frontend to electron app
PS C:\Users\hendr\Deployment\s3-migration-scheduler\client> cd ..\electron-app
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> robocopy ..\client\build .\build /E

# 3. Build electron app
PS C:\Users\hendr\Deployment\s3-migration-scheduler\electron-app> npx electron-builder --win
```

---

## 🔍 **Common Issues & Solutions**

### **Issue 1: Wrong Directory**
```
Error: Client directory not found
Solution: Run from project root, not from scripts folder
```

**Fix:**
```powershell
# Wrong (from scripts folder):
PS C:\...\s3-migration-scheduler\scripts> .\build-windows.bat

# Correct (from project root):
PS C:\...\s3-migration-scheduler> scripts\build-windows.bat
```

### **Issue 2: Missing Dependencies**
```
Error: npm install failed
Solution: Install dependencies in correct order
```

**Fix:**
```powershell
# Install in this order:
npm install                    # Root dependencies
cd client && npm install      # Frontend dependencies  
cd ../electron-app && npm install  # Electron dependencies
```

### **Issue 3: Node.js Version**
```
Error: Node.js version too old
Solution: Install Node.js 16+
```

**Fix:**
```powershell
# Check version:
node --version
# If < v16, download from: https://nodejs.org
```

### **Issue 4: Build Tools Missing**
```
Error: electron-builder fails
Solution: Install Windows build tools
```

**Fix:**
```powershell
# Install build tools:
npm install --global windows-build-tools
# Or install Visual Studio Build Tools
```

### **Issue 5: Permission Issues**
```
Error: Access denied
Solution: Run as Administrator
```

**Fix:**
```powershell
# Right-click PowerShell → "Run as Administrator"
# Then run the build script
```

---

## 🛠️ **Alternative Build Methods**

### **Method 1: Simple Electron Build**
```powershell
# If full script fails, try simple electron build:
PS C:\...\s3-migration-scheduler> cd electron-app
PS C:\...\s3-migration-scheduler\electron-app> npm run build:win
```

### **Method 2: Step-by-Step Build**
```powershell
# 1. Verify Node.js
node --version && npm --version

# 2. Install everything
npm install
cd client && npm install && cd ..
cd electron-app && npm install && cd ..

# 3. Build frontend
cd client && npm run build && cd ..

# 4. Copy to electron
robocopy client\build electron-app\build /E

# 5. Build electron
cd electron-app && npx electron-builder --win
```

### **Method 3: Use PowerShell Script**
```powershell
# Create simple PowerShell script: build.ps1
Set-Location "C:\Users\hendr\Deployment\s3-migration-scheduler"

Write-Host "Building frontend..." -ForegroundColor Green
Set-Location client
npm run build
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Copying to electron..." -ForegroundColor Green
Set-Location ..\electron-app
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
Copy-Item -Recurse ..\client\build .\build

Write-Host "Building Windows app..." -ForegroundColor Green
npx electron-builder --win
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Build completed!" -ForegroundColor Green
```

---

## 📋 **Diagnostic Checklist**

Run these commands to diagnose the issue:

```powershell
# 1. Check environment
node --version
npm --version
git --version

# 2. Check project structure
dir | Select-String "client|server|electron-app|scripts"

# 3. Check package.json files
Test-Path client\package.json
Test-Path electron-app\package.json
Test-Path server\package.json

# 4. Check dependencies
Test-Path client\node_modules
Test-Path electron-app\node_modules

# 5. Check if client can build
cd client
npm run build

# 6. Check if electron can build
cd ..\electron-app  
npx electron-builder --help
```

---

## 🎯 **Expected Successful Output**

When working correctly, you should see:

```
================================================================
 S3 Migration Scheduler - Windows Build Script
================================================================

[INFO] Checking prerequisites...
[INFO] Node.js version: v18.17.0
[INFO] npm version: 8.19.0
[INFO] All prerequisites check passed!

[INFO] Setting up build directories...
[INFO] Checking dependencies...
[INFO] Building React frontend...
[INFO] Copying frontend build to Electron app...
[INFO] Building Electron application...

[INFO] Build completed! Checking results...
[INFO] Generated files in electron-app/dist directory:
S3-Migration-Scheduler Setup 1.0.0.exe
S3-Migration-Scheduler-1.0.0.exe
win-unpacked

[INFO] Files copied to main dist directory
[INFO] Build process completed successfully!
```

---

## 🚀 **Next Steps**

1. **Try the debug script first**: `scripts\build-windows-debug.bat`
2. **If that fails, try manual build** step-by-step
3. **Check the diagnostic commands** to identify the issue
4. **Report the specific error message** for more targeted help

**Most likely cause:** Running from wrong directory or missing dependencies. The script expects to be run from the project root, not from the scripts folder.

**Quick fix:** Try running from project root:
```powershell
PS C:\Users\hendr\Deployment\s3-migration-scheduler> scripts\build-windows.bat
```