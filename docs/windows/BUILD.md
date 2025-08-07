# Windows Build Guide - S3 Migration Scheduler

This document explains how to build Windows packages for the S3 Migration Scheduler from source.

## 🎯 Overview

The project uses `electron-builder` to create multiple Windows package formats:
- **NSIS Installer**: Professional installer with shortcuts and uninstaller
- **Portable Executable**: Self-contained single file
- **ZIP Archive**: Extractable package for manual deployment

## 🧰 Prerequisites

### System Requirements
- **Windows 10/11** (recommended for building)
- **Node.js 18+** with npm
- **Visual Studio Build Tools** (for native module compilation)
- **Git** for source code
- **PowerShell** or Command Prompt

### 1. Install Node.js
```powershell
# Download from: https://nodejs.org/
# Or use Chocolatey
choco install nodejs

# Verify installation
node --version
npm --version
```

### 2. Install Visual Studio Build Tools
This is **required** for compiling `better-sqlite3` native module.

**Option A: Visual Studio Build Tools (Recommended)**
```powershell
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Install with "Desktop development with C++" workload

# Required components:
# ✅ MSVC v143 - VS 2022 C++ x64/x86 build tools
# ✅ Windows 11 SDK (latest version)
# ✅ C++ CMake tools for Visual Studio
```

**Option B: Visual Studio Community**
```powershell
# Download Visual Studio Community
# Install with "Desktop development with C++" workload
```

**Option C: Chocolatey (Automated)**
```powershell
choco install visualstudio2022buildtools --params "--add Microsoft.VisualStudio.Workload.VCTools"
```

### 3. Install Git
```powershell
# Download from: https://git-scm.com/
# Or use Chocolatey
choco install git

# Verify installation
git --version
```

### 4. Optional: Windows Developer Mode
Enable Developer Mode for code signing (avoids some build warnings):
```powershell
# Settings > Update & Security > For developers > Developer mode
# Or via PowerShell (as Administrator):
reg add "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" /t REG_DWORD /f /v "AllowDevelopmentWithoutDevLicense" /d "1"
```

## 🚀 Build Process

### Step 1: Clone Repository
```powershell
# Clone the repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Check current branch
git branch
```

### Step 2: Prepare Frontend
```powershell
# Build React frontend
cd client
npm install
npm run build

# Verify build output
dir build\
cd ..
```

### Step 3: Prepare Backend
```powershell
# Install server dependencies
cd server
npm install

# Test server can start (optional)
node index.js
# Press Ctrl+C to stop

cd ..
```

### Step 4: Build Windows Packages
```powershell
# Navigate to electron app
cd electron-app

# Install dependencies (includes better-sqlite3 compilation)
npm install

# Build all Windows packages
npm run build:win

# Alternative: Build specific targets
# npm run build:win -- --win nsis     # NSIS installer only
# npm run build:win -- --win portable # Portable only
# npm run build:win -- --win zip      # ZIP only
```

### Step 5: Verify Build Results
```powershell
# Check created packages
dir dist\

# Expected output:
# S3 Migration Scheduler-1.0.0-win-x64.exe      (~114MB) - NSIS Installer
# S3 Migration Scheduler-1.0.0-win-ia32.exe     (~104MB) - NSIS Installer  
# S3 Migration Scheduler-1.0.0-portable-x64.exe (~113MB) - Portable
# S3 Migration Scheduler-1.0.0-portable-ia32.exe (~104MB) - Portable
# S3 Migration Scheduler-1.0.0-portable.exe     (~217MB) - Universal Portable
# S3 Migration Scheduler-1.0.0-win-x64.zip      (~151MB) - ZIP Archive
# S3 Migration Scheduler-1.0.0-win-ia32.zip     (~138MB) - ZIP Archive
# win-unpacked\                                  - Unpacked x64 files
# win-ia32-unpacked\                             - Unpacked x86 files
```

### Step 6: Test Built Packages
```powershell
# Test the unpacked version first
cd "dist\win-unpacked"
& ".\S3 Migration Scheduler.exe"

# Test ZIP package
cd ..\..
Expand-Archive "dist\S3 Migration Scheduler-1.0.0-win-x64.zip" -DestinationPath "test-zip"
cd test-zip
& ".\S3 Migration Scheduler.exe"
```

## 🔧 Configuration Details

### electron-builder Configuration
The build configuration is defined in `electron-app/package.json`:

```json
{
  "build": {
    "win": {
      "target": [
        { "target": "nsis", "arch": ["x64", "ia32"] },
        { "target": "portable", "arch": ["x64", "ia32"] },
        { "target": "zip", "arch": ["x64", "ia32"] }
      ],
      "icon": "assets/icon.ico",
      "artifactName": "${productName}-${version}-${os}-${arch}.${ext}",
      "publisherName": "S3 Migration Scheduler Team"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### Key Build Features
- **Multi-architecture**: Builds for both x64 and x86
- **Native modules**: Compiles `better-sqlite3` for Windows
- **MinIO client**: Includes Windows `mc.exe` binary
- **Resource bundling**: Packages server and client code
- **Icon support**: Uses ICO icons for Windows
- **Code signing**: Optional (requires certificate)

## 🎯 Build Targets

### Individual Target Builds
```powershell
# Build only NSIS installer
npm run build:win -- --win nsis

# Build only portable executables
npm run build:win -- --win portable

# Build only ZIP archives
npm run build:win -- --win zip

# Build only x64 architecture
npm run build:win -- --x64

# Build only x86 architecture
npm run build:win -- --ia32
```

### Custom Configuration
```powershell
# Build with custom app name
npm run build:win -- --config.productName="Custom S3 Migrator"

# Skip code signing (faster builds)
npm run build:win -- --config.win.sign=null

# Custom output directory
npm run build:win -- --config.directories.output=custom-dist

# Custom icon
npm run build:win -- --config.win.icon=path/to/custom.ico
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Visual Studio Build Tools Missing
```powershell
# Error: "gyp ERR! find VS"
# Error: "msbuild.exe failed with exit code: 1"

# Solution: Install Visual Studio Build Tools
# Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Install "Desktop development with C++" workload
```

#### 2. better-sqlite3 Compilation Fails
```powershell
# Error: "node-gyp rebuild failed"
# Error: "error MSB8036: The Windows SDK version 10.0 was not found"

# Solution 1: Install Windows SDK
# Download latest Windows SDK from Microsoft

# Solution 2: Use different Node.js version
nvm install 18.17.0
nvm use 18.17.0

# Solution 3: Clean and rebuild
npm cache clean --force
rm -rf node_modules
npm install
```

#### 3. Icon File Issues
```powershell
# Error: "icon.ico: file not found"
# Error: "Reserved header is not 0"

# Solution: Ensure valid ICO file exists
dir electron-app\assets\icon.ico

# Download valid ICO if needed (example)
# Invoke-WebRequest -Uri "https://example.com/icon.ico" -OutFile "assets\icon.ico"
```

#### 4. Code Signing Errors
```powershell
# Error: "cannot execute cause=exit status 2"
# Error: "A required privilege is not held by the client"

# Solution 1: Enable Developer Mode (Windows Settings)
# Solution 2: Skip code signing
npm run build:win -- --config.win.sign=null

# Solution 3: Provide signing certificate
# Set environment variables:
# $env:CSC_LINK = "path\to\certificate.p12"
# $env:CSC_KEY_PASSWORD = "certificate_password"
```

#### 5. NSIS Installer Build Fails
```powershell
# Error: "makensis.exe process failed"
# Error: "Plugin not found"

# Solution 1: Remove custom NSIS scripts
# Edit package.json and remove any custom "include" settings

# Solution 2: Install NSIS manually
choco install nsis
```

#### 6. Out of Memory Issues
```powershell
# Error: "JavaScript heap out of memory"

# Solution: Increase Node.js memory limit
$env:NODE_OPTIONS = "--max-old-space-size=4096"
npm run build:win
```

### Debug Mode
```powershell
# Enable debug output
$env:DEBUG = "electron-builder"
npm run build:win

# Enable verbose logging
npm run build:win -- --publish=never --debug

# Check Electron version compatibility
npx electron --version
```

## 📦 Package Details

### NSIS Installer
- **Type**: Professional Windows installer
- **Features**: Desktop shortcut, Start Menu entry, Add/Remove Programs
- **Installation**: `C:\Program Files\S3 Migration Scheduler\`
- **Uninstaller**: Included
- **Size**: ~104-114MB

### Portable Executable
- **Type**: Self-contained executable
- **Features**: No installation required, single file
- **Usage**: Copy and run anywhere
- **Size**: ~113-217MB (depending on architecture)

### ZIP Archive
- **Type**: Compressed folder
- **Features**: Manual extraction and deployment
- **Usage**: Extract and run `S3 Migration Scheduler.exe`
- **Size**: ~138-151MB

## 🚀 Automated Builds

### GitHub Actions (Future Enhancement)
```yaml
# .github/workflows/build-windows.yml
name: Build Windows Packages

on:
  push:
    tags: ['v*']

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          npm install
          cd client && npm install && npm run build && cd ..
          cd server && npm install && cd ..
      - name: Build Windows packages
        run: |
          cd electron-app
          npm install
          npm run build:win
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: windows-packages
          path: electron-app/dist/*.exe, electron-app/dist/*.zip
```

### Batch Script for Automated Builds
```batch
@echo off
REM automated-build.bat
echo Building S3 Migration Scheduler for Windows...

echo Step 1: Building frontend...
cd client
call npm install
call npm run build
cd ..

echo Step 2: Installing server dependencies...
cd server
call npm install
cd ..

echo Step 3: Building Electron packages...
cd electron-app
call npm install
call npm run build:win

echo Build complete! Check electron-app\dist\ for packages.
pause
```

## 📋 Build Checklist

### Before Building:
- [ ] Node.js 18+ installed and working
- [ ] Visual Studio Build Tools installed with C++ workload
- [ ] Git repository cloned
- [ ] Frontend built (`client/build/` exists)
- [ ] Server dependencies installed
- [ ] MinIO client (`mc.exe`) present in root directory
- [ ] Valid icon files in `electron-app/assets/`

### During Build:
- [ ] `npm install` completes without errors
- [ ] `better-sqlite3` compiles successfully
- [ ] No NSIS script errors
- [ ] Code signing completes (or is skipped)

### After Build:
- [ ] All expected packages created (7 packages total)
- [ ] File sizes are reasonable (100-220MB range)
- [ ] Executables run without errors
- [ ] Installer creates shortcuts correctly
- [ ] Portable versions work from different locations
- [ ] ZIP archives extract properly

### Testing Checklist:
- [ ] Application starts successfully
- [ ] Backend server initializes
- [ ] Frontend loads in Electron window
- [ ] S3 connection test works
- [ ] Migration creation flow works
- [ ] Database operations function
- [ ] Logs are created properly

## 🎉 Success!

If all steps complete successfully, you'll have production-ready Windows packages:

```
electron-app/dist/
├── S3 Migration Scheduler-1.0.0-win-x64.exe      # NSIS Installer (x64)
├── S3 Migration Scheduler-1.0.0-win-ia32.exe     # NSIS Installer (x86)
├── S3 Migration Scheduler-1.0.0-portable-x64.exe # Portable (x64)
├── S3 Migration Scheduler-1.0.0-portable-ia32.exe # Portable (x86)
├── S3 Migration Scheduler-1.0.0-portable.exe     # Portable (Universal)
├── S3 Migration Scheduler-1.0.0-win-x64.zip      # ZIP Archive (x64)
├── S3 Migration Scheduler-1.0.0-win-ia32.zip     # ZIP Archive (x86)
├── win-unpacked/                                  # Unpacked x64 files
└── win-ia32-unpacked/                             # Unpacked x86 files
```

## 🔄 Continuous Integration

### Local Development Workflow
```powershell
# Quick development build (skip packaging)
npm run build:win -- --dir

# Build and test specific target
npm run build:win -- --win portable --x64
& "dist\S3 Migration Scheduler-1.0.0-portable-x64.exe"

# Clean build (fresh start)
rm -rf node_modules, dist
npm install
npm run build:win
```

### Release Preparation
```powershell
# 1. Update version in package.json files
# 2. Create git tag
git tag v1.0.1
git push origin v1.0.1

# 3. Build release packages
npm run build:win

# 4. Test all packages
# 5. Upload to GitHub Releases
```

---

**Need help?** Check the [main Windows README](README.md) or open an issue on GitHub!