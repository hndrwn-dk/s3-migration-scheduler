@echo off
REM S3 Migration Scheduler - Complete Build and Release Script
REM This script automates the entire repackaging process for new releases

setlocal enabledelayedexpansion

REM Configuration
set VERSION=1.1.0
set DOCKER_USERNAME=hndrwn
set IMAGE_NAME=s3-migration-scheduler

REM Colors for output (if supported)
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set BLUE=[94m
set NC=[0m

echo.
echo %BLUE%=========================================================================%NC%
echo %BLUE%           S3 Migration Scheduler - Complete Build and Release          %NC%
echo %BLUE%                              Version %VERSION%                              %NC%
echo %BLUE%=========================================================================%NC%
echo.

REM Get script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

echo %YELLOW%Project root: %PROJECT_ROOT%%NC%
echo.

REM Step 1: Verify prerequisites
echo %BLUE%Step 1: Checking Prerequisites...%NC%
echo ======================================

REM Check Node.js
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%ERROR: Node.js is not installed or not in PATH%NC%
    pause
    exit /b 1
)
echo %GREEN%✓ Node.js found%NC%

REM Check npm
npm --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%ERROR: npm is not installed or not in PATH%NC%
    pause
    exit /b 1
)
echo %GREEN%✓ npm found%NC%

REM Check Docker (optional)
docker --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %YELLOW%⚠ Docker not found - Docker builds will be skipped%NC%
    set DOCKER_AVAILABLE=false
) else (
    echo %GREEN%✓ Docker found%NC%
    set DOCKER_AVAILABLE=true
)

echo.

REM Step 2: Clean previous builds
echo %BLUE%Step 2: Cleaning Previous Builds...%NC%
echo ====================================

cd /d "%PROJECT_ROOT%"

REM Clean dist directories
if exist "electron-app\dist" (
    echo Cleaning electron-app\dist...
    rmdir /s /q "electron-app\dist"
)

REM Clean node_modules (optional)
choice /c YN /m "Clean all node_modules directories (recommended for fresh build)? "
if !errorlevel! equ 1 (
    echo Cleaning node_modules...
    if exist "node_modules" rmdir /s /q "node_modules"
    if exist "client\node_modules" rmdir /s /q "client\node_modules"
    if exist "server\node_modules" rmdir /s /q "server\node_modules"
    if exist "electron-app\node_modules" rmdir /s /q "electron-app\node_modules"
)

echo %GREEN%✓ Cleanup completed%NC%
echo.

REM Step 3: Install dependencies
echo %BLUE%Step 3: Installing Dependencies...%NC%
echo ===================================

echo Installing root dependencies...
npm install
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to install root dependencies%NC%
    pause
    exit /b 1
)

echo Installing client dependencies...
cd client
npm install
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to install client dependencies%NC%
    pause
    exit /b 1
)

echo Installing server dependencies...
cd ..\server
npm install
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to install server dependencies%NC%
    pause
    exit /b 1
)

echo Installing electron app dependencies...
cd ..\electron-app
npm install
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to install electron app dependencies%NC%
    pause
    exit /b 1
)

cd /d "%PROJECT_ROOT%"
echo %GREEN%✓ All dependencies installed%NC%
echo.

REM Step 4: Build client
echo %BLUE%Step 4: Building React Client...%NC%
echo =================================

cd client
npm run build
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to build React client%NC%
    pause
    exit /b 1
)

cd /d "%PROJECT_ROOT%"
echo %GREEN%✓ React client built successfully%NC%
echo.

REM Step 5: Build desktop packages
echo %BLUE%Step 5: Building Desktop Packages...%NC%
echo =====================================

cd electron-app

echo Building Windows packages...
npm run build:win
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to build Windows packages%NC%
    pause
    exit /b 1
)
echo %GREEN%✓ Windows packages built%NC%

REM Ask if user wants to build Linux packages
choice /c YN /m "Build Linux packages? (requires Linux build tools) "
if !errorlevel! equ 1 (
    echo Building Linux packages...
    npm run build:linux
    if !errorlevel! neq 0 (
        echo %YELLOW%⚠ Warning: Linux build failed (this is normal on Windows)%NC%
    ) else (
        echo %GREEN%✓ Linux packages built%NC%
    )
)

cd /d "%PROJECT_ROOT%"
echo.

REM Step 6: Docker build and push (optional)
if "%DOCKER_AVAILABLE%"=="true" (
    echo %BLUE%Step 6: Docker Build and Push...%NC%
    echo ================================
    
    choice /c YN /m "Build and push Docker images? "
    if !errorlevel! equ 1 (
        echo Calling Docker build script...
        call "%SCRIPT_DIR%docker-build-and-push.bat"
        if !errorlevel! neq 0 (
            echo %YELLOW%⚠ Warning: Docker build failed%NC%
        ) else (
            echo %GREEN%✓ Docker images built and pushed%NC%
        )
    )
    echo.
)

REM Step 7: List built assets
echo %BLUE%Step 7: Build Summary...%NC%
echo ========================

echo.
echo %GREEN%BUILD COMPLETED SUCCESSFULLY!%NC%
echo.

echo %YELLOW%Built Assets:%NC%
echo -------------

if exist "electron-app\dist" (
    echo %GREEN%Desktop Packages:%NC%
    dir /b "electron-app\dist\*.exe" 2>nul && echo   ✓ Windows installer (.exe)
    dir /b "electron-app\dist\*.zip" 2>nul && echo   ✓ Windows portable (.zip)
    dir /b "electron-app\dist\*.AppImage" 2>nul && echo   ✓ Linux AppImage
    dir /b "electron-app\dist\*.deb" 2>nul && echo   ✓ Debian package (.deb)
    dir /b "electron-app\dist\*.dmg" 2>nul && echo   ✓ macOS disk image (.dmg)
    echo.
)

if "%DOCKER_AVAILABLE%"=="true" (
    echo %GREEN%Docker Images:%NC%
    echo   ✓ %DOCKER_USERNAME%/%IMAGE_NAME%:%VERSION%
    echo   ✓ %DOCKER_USERNAME%/%IMAGE_NAME%:latest
    echo.
)

echo %GREEN%React Client:%NC%
echo   ✓ client\build\ (production build)
echo.

REM Step 8: Release instructions
echo %BLUE%Step 8: Next Steps for GitHub Release...%NC%
echo =========================================

echo.
echo %YELLOW%Ready for GitHub Release!%NC%
echo.
echo %GREEN%1. Create GitHub Release:%NC%
echo    • Go to: https://github.com/hndrwn-dk/s3-migration-scheduler/releases
echo    • Click "Create a new release"
echo    • Tag version: v%VERSION%
echo    • Title: S3 Migration Scheduler v%VERSION% - Docker Hub Integration ^& Enhanced Features
echo.
echo %GREEN%2. Upload Release Assets:%NC%
if exist "electron-app\dist" (
    echo    Upload these files from electron-app\dist\:
    for %%f in ("electron-app\dist\*.exe" "electron-app\dist\*.zip" "electron-app\dist\*.AppImage" "electron-app\dist\*.deb" "electron-app\dist\*.dmg") do (
        if exist "%%f" echo      • %%~nxf
    )
)
echo.
echo %GREEN%3. Release Notes:%NC%
echo    • Copy from: RELEASE_NOTES_v%VERSION%.md
echo    • Include Docker Hub deployment instructions
echo    • Mention corporate environment fixes
echo.
echo %GREEN%4. Docker Hub:%NC%
echo    • Images already available at: %DOCKER_USERNAME%/%IMAGE_NAME%:%VERSION%
echo    • Test deployment: docker run -d -p 5000:5000 %DOCKER_USERNAME%/%IMAGE_NAME%:%VERSION%
echo.

REM Step 9: Open useful directories
echo %BLUE%Step 9: Opening Build Directories...%NC%
echo =====================================

choice /c YN /m "Open electron-app\dist directory in Explorer? "
if !errorlevel! equ 1 (
    if exist "electron-app\dist" (
        start explorer "electron-app\dist"
    ) else (
        echo %RED%ERROR: electron-app\dist directory not found%NC%
    )
)

choice /c YN /m "Open GitHub releases page in browser? "
if !errorlevel! equ 1 (
    start https://github.com/hndrwn-dk/s3-migration-scheduler/releases
)

echo.
echo %GREEN%=========================================================================%NC%
echo %GREEN%                    BUILD AND RELEASE SCRIPT COMPLETED                   %NC%
echo %GREEN%                              Version %VERSION%                              %NC%
echo %GREEN%=========================================================================%NC%
echo.

pause