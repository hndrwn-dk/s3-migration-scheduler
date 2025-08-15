@echo off
REM S3 Migration Scheduler - Complete Build and Release Script
REM This script automates the entire repackaging process for new releases

setlocal enabledelayedexpansion

REM Configuration
set VERSION=1.1.0
set DOCKER_USERNAME=hndrwn
set IMAGE_NAME=s3-migration-scheduler

echo.
echo =========================================================================
echo           S3 Migration Scheduler - Complete Build and Release          
echo                              Version %VERSION%                              
echo =========================================================================
echo.

REM Get script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..

echo Project root: %PROJECT_ROOT%
echo Scripts structure: build/, setup/, db/
echo.

REM Step 1: Verify prerequisites
echo Step 1: Checking Prerequisites...
echo ======================================

REM Check Node.js
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)
echo + Node.js found

REM Check npm
npm --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)
echo + npm found

REM Check Docker (optional)
docker --version >nul 2>&1
if !errorlevel! neq 0 (
    echo WARNING: Docker not found - Docker builds will be skipped
    set DOCKER_AVAILABLE=false
) else (
    echo + Docker found
    set DOCKER_AVAILABLE=true
)

echo.

REM Step 2: Clean previous builds
echo Step 2: Cleaning Previous Builds...
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

echo + Cleanup completed
echo.

REM Step 3: Install dependencies
echo Step 3: Installing Dependencies...
echo ===================================

echo Installing root dependencies...
npm install
if !errorlevel! neq 0 (
    echo ERROR: Failed to install root dependencies
    pause
    exit /b 1
)

echo Installing client dependencies...
cd client
npm install
if !errorlevel! neq 0 (
    echo ERROR: Failed to install client dependencies
    pause
    exit /b 1
)

echo Installing server dependencies...
cd ..\server
npm install
if !errorlevel! neq 0 (
    echo ERROR: Failed to install server dependencies
    pause
    exit /b 1
)

echo Installing electron app dependencies...
cd ..\electron-app
npm install
if !errorlevel! neq 0 (
    echo ERROR: Failed to install electron app dependencies
    pause
    exit /b 1
)

cd /d "%PROJECT_ROOT%"
echo + All dependencies installed
echo.

REM Step 4: Build client
echo Step 4: Building React Client...
echo =================================

cd client
npm run build
if !errorlevel! neq 0 (
    echo ERROR: Failed to build React client
    pause
    exit /b 1
)

cd /d "%PROJECT_ROOT%"
echo + React client built successfully
echo.

REM Step 5: Build desktop packages using specialized scripts
echo Step 5: Building Desktop Packages...
echo =====================================

REM Windows packages (always build on Windows)
echo Calling Windows build script...
call "%SCRIPT_DIR%windows\build-windows.bat"
if !errorlevel! neq 0 (
    echo ERROR: Windows build failed
    pause
    exit /b 1
)
echo + Windows packages completed

REM Ask if user wants to build Linux packages
choice /c YN /m "Build Linux packages? (requires Linux build tools) "
if !errorlevel! equ 1 (
    echo Calling Linux build script...
    call "%SCRIPT_DIR%linux\build-linux.sh"
    if !errorlevel! neq 0 (
        echo WARNING: Linux build failed (this is normal on Windows)
    ) else (
        echo + Linux packages completed
    )
)

echo.

REM Step 6: Docker build and push using specialized script
if "%DOCKER_AVAILABLE%"=="true" (
    echo Step 6: Docker Build and Push...
    echo ================================
    
    choice /c YN /m "Build and push Docker images? "
    if !errorlevel! equ 1 (
        echo Calling Docker build script...
        call "%SCRIPT_DIR%docker\docker-build-and-push.bat"
        if !errorlevel! neq 0 (
            echo WARNING: Docker build failed
        ) else (
            echo + Docker images built and pushed
        )
    )
    echo.
)

REM Step 7: List built assets
echo Step 7: Build Summary...
echo ========================

echo.
echo BUILD COMPLETED SUCCESSFULLY!
echo.

echo Built Assets:
echo -------------

if exist "electron-app\dist" (
    echo Desktop Packages:
    dir /b "electron-app\dist\*.exe" 2>nul && echo   + Windows installer (.exe)
    dir /b "electron-app\dist\*.zip" 2>nul && echo   + Windows portable (.zip)
    dir /b "electron-app\dist\*.AppImage" 2>nul && echo   + Linux AppImage
    dir /b "electron-app\dist\*.deb" 2>nul && echo   + Debian package (.deb)
    dir /b "electron-app\dist\*.dmg" 2>nul && echo   + macOS disk image (.dmg)
    echo.
)

if "%DOCKER_AVAILABLE%"=="true" (
    echo Docker Images:
    echo   + %DOCKER_USERNAME%/%IMAGE_NAME%:%VERSION%
    echo   + %DOCKER_USERNAME%/%IMAGE_NAME%:latest
    echo.
)

echo React Client:
echo   + client\build\ (production build)
echo.

REM Step 8: Release instructions
echo Step 8: Next Steps for GitHub Release...
echo =========================================

echo.
echo Ready for GitHub Release!
echo.
echo 1. Create GitHub Release:
echo    • Go to: https://github.com/hndrwn-dk/s3-migration-scheduler/releases
echo    • Click "Create a new release"
echo    • Tag version: v%VERSION%
echo    • Title: S3 Migration Scheduler v%VERSION% - Docker Hub Integration ^& Enhanced Features
echo.
echo 2. Upload Release Assets:
if exist "electron-app\dist" (
    echo    Upload these files from electron-app\dist\:
    for %%f in ("electron-app\dist\*.exe" "electron-app\dist\*.zip" "electron-app\dist\*.AppImage" "electron-app\dist\*.deb" "electron-app\dist\*.dmg") do (
        if exist "%%f" echo      • %%~nxf
    )
)
echo.
echo 3. Release Notes:
echo    • Copy from: RELEASE_NOTES_v%VERSION%.md
echo    • Include Docker Hub deployment instructions
echo    • Mention corporate environment fixes
echo.
echo 4. Docker Hub:
echo    • Images already available at: %DOCKER_USERNAME%/%IMAGE_NAME%:%VERSION%
echo    • Test deployment: docker run -d -p 5000:5000 %DOCKER_USERNAME%/%IMAGE_NAME%:%VERSION%
echo.

REM Step 9: Open useful directories
echo Step 9: Opening Build Directories...
echo =====================================

choice /c YN /m "Open electron-app\dist directory in Explorer? "
if !errorlevel! equ 1 (
    if exist "electron-app\dist" (
        start explorer "electron-app\dist"
    ) else (
        echo ERROR: electron-app\dist directory not found
    )
)

choice /c YN /m "Open GitHub releases page in browser? "
if !errorlevel! equ 1 (
    start https://github.com/hndrwn-dk/s3-migration-scheduler/releases
)

echo.
echo =========================================================================
echo                    BUILD AND RELEASE SCRIPT COMPLETED                   
echo                         (Using Structured Scripts)                      
echo                              Version %VERSION%                              
echo =========================================================================
echo.

pause