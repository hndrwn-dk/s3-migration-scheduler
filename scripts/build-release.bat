@echo off
REM S3 Migration Scheduler - Complete Release Build Script
REM This script automates the entire release building process

setlocal enabledelayedexpansion

REM Color definitions for better output
set GREEN=[92m
set YELLOW=[93m
set RED=[91m
set BLUE=[94m
set RESET=[0m

echo %BLUE%
echo ====================================================================
echo    S3 Migration Scheduler - Release Build Script v1.1.0
echo ====================================================================
echo %RESET%

REM Get version from package.json
for /f "tokens=2 delims=:" %%a in ('findstr "version" package.json') do (
    set VERSION_LINE=%%a
    set VERSION=!VERSION_LINE: "=!
    set VERSION=!VERSION:",=!
    set VERSION=!VERSION: =!
)

echo %GREEN%Building release for version: %VERSION%%RESET%
echo.

REM Create release directory
set RELEASE_DIR=release-v%VERSION%
if exist "%RELEASE_DIR%" (
    echo %YELLOW%Cleaning existing release directory...%RESET%
    rmdir /s /q "%RELEASE_DIR%"
)
mkdir "%RELEASE_DIR%"
mkdir "%RELEASE_DIR%\desktop"
mkdir "%RELEASE_DIR%\docker"
mkdir "%RELEASE_DIR%\source"

echo %BLUE%Step 1: Building React Client%RESET%
echo ----------------------------------------
cd client
if not exist "node_modules" (
    echo Installing client dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to install client dependencies%RESET%
        pause
        exit /b 1
    )
)

echo Building React production bundle...
npm run build
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to build React client%RESET%
    pause
    exit /b 1
)
echo %GREEN%✓ React client built successfully%RESET%
cd ..

echo.
echo %BLUE%Step 2: Installing Server Dependencies%RESET%
echo ----------------------------------------
cd server
if not exist "node_modules" (
    echo Installing server dependencies...
    npm install --production
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to install server dependencies%RESET%
        pause
        exit /b 1
    )
)
echo %GREEN%✓ Server dependencies ready%RESET%
cd ..

echo.
echo %BLUE%Step 3: Building Desktop Applications%RESET%
echo ----------------------------------------
cd electron-app

if not exist "node_modules" (
    echo Installing electron dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to install electron dependencies%RESET%
        pause
        exit /b 1
    )
)

echo Building Windows packages...
npm run build:win
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to build Windows packages%RESET%
    pause
    exit /b 1
)
echo %GREEN%✓ Windows packages built successfully%RESET%

echo Building Linux packages...
npm run build:linux
if !errorlevel! neq 0 (
    echo %YELLOW%WARNING: Linux build failed (normal on Windows)%RESET%
) else (
    echo %GREEN%✓ Linux packages built successfully%RESET%
)

echo Building macOS packages...
npm run build:mac
if !errorlevel! neq 0 (
    echo %YELLOW%WARNING: macOS build failed (normal on Windows)%RESET%
) else (
    echo %GREEN%✓ macOS packages built successfully%RESET%
)

cd ..

echo.
echo %BLUE%Step 4: Copying Release Assets%RESET%
echo ----------------------------------------

REM Copy desktop packages
if exist "electron-app\dist" (
    echo Copying desktop packages...
    xcopy "electron-app\dist\*.exe" "%RELEASE_DIR%\desktop\" /Y >nul 2>&1
    xcopy "electron-app\dist\*.zip" "%RELEASE_DIR%\desktop\" /Y >nul 2>&1
    xcopy "electron-app\dist\*.AppImage" "%RELEASE_DIR%\desktop\" /Y >nul 2>&1
    xcopy "electron-app\dist\*.deb" "%RELEASE_DIR%\desktop\" /Y >nul 2>&1
    xcopy "electron-app\dist\*.dmg" "%RELEASE_DIR%\desktop\" /Y >nul 2>&1
    xcopy "electron-app\dist\*.tar.gz" "%RELEASE_DIR%\desktop\" /Y >nul 2>&1
    echo %GREEN%✓ Desktop packages copied%RESET%
)

REM Copy Docker files
echo Copying Docker files...
copy "Dockerfile" "%RELEASE_DIR%\docker\" >nul 2>&1
copy "docker-compose.yml" "%RELEASE_DIR%\docker\" >nul 2>&1
copy ".dockerignore" "%RELEASE_DIR%\docker\" >nul 2>&1
copy "scripts\docker-build-and-push.bat" "%RELEASE_DIR%\docker\" >nul 2>&1
copy "scripts\docker-build-and-push.sh" "%RELEASE_DIR%\docker\" >nul 2>&1
echo %GREEN%✓ Docker files copied%RESET%

REM Copy documentation
echo Copying documentation...
copy "README.md" "%RELEASE_DIR%\" >nul 2>&1
copy "CHANGELOG.md" "%RELEASE_DIR%\" >nul 2>&1
copy "RELEASE_NOTES_v%VERSION%.md" "%RELEASE_DIR%\" >nul 2>&1 || echo %YELLOW%WARNING: Release notes not found%RESET%
copy "RELEASE_CHECKLIST_v%VERSION%.md" "%RELEASE_DIR%\" >nul 2>&1 || echo %YELLOW%WARNING: Release checklist not found%RESET%
copy "LICENSE" "%RELEASE_DIR%\" >nul 2>&1
xcopy "docs" "%RELEASE_DIR%\docs\" /E /I >nul 2>&1
echo %GREEN%✓ Documentation copied%RESET%

echo.
echo %BLUE%Step 5: Generating Release Summary%RESET%
echo ----------------------------------------

REM Create release summary
(
echo S3 Migration Scheduler v%VERSION% - Release Assets
echo ================================================
echo.
echo Build Date: %DATE% %TIME%
echo Built on: %COMPUTERNAME%
echo.
echo Desktop Packages:
for %%f in ("%RELEASE_DIR%\desktop\*") do echo   - %%~nxf
echo.
echo Docker Images:
echo   - hndrwn/s3-migration-scheduler:%VERSION%
echo   - hndrwn/s3-migration-scheduler:latest
echo.
echo Docker Hub: https://hub.docker.com/r/hndrwn/s3-migration-scheduler
echo GitHub: https://github.com/hndrwn-dk/s3-migration-scheduler
echo.
echo Installation Instructions:
echo.
echo Docker Deployment:
echo   docker run -d -p 5000:5000 hndrwn/s3-migration-scheduler:%VERSION%
echo.
echo Docker Compose:
echo   docker-compose up -d
echo.
echo Desktop Installation:
echo   Windows: Run the .exe installer or extract .zip
echo   Linux: Run .AppImage or install .deb package
echo.
) > "%RELEASE_DIR%\RELEASE_SUMMARY.txt"

echo.
echo %BLUE%Step 6: Build Summary%RESET%
echo ----------------------------------------

echo %GREEN%✓ Release build completed successfully!%RESET%
echo.
echo %YELLOW%Release directory: %RELEASE_DIR%%RESET%
echo.
echo Desktop packages available in: %RELEASE_DIR%\desktop\
dir "%RELEASE_DIR%\desktop" /B 2>nul || echo   No desktop packages found

echo.
echo %BLUE%Next Steps:%RESET%
echo 1. Review assets in: %RELEASE_DIR%\
echo 2. Test desktop packages
echo 3. Create GitHub release: https://github.com/hndrwn-dk/s3-migration-scheduler/releases/new
echo 4. Upload assets from %RELEASE_DIR%\desktop\
echo 5. Tag version: v%VERSION%
echo.
echo %GREEN%Docker Hub images already available:%RESET%
echo   hndrwn/s3-migration-scheduler:%VERSION%
echo   hndrwn/s3-migration-scheduler:latest
echo.

echo %BLUE%========== BUILD COMPLETE ==========%RESET%
echo.

REM Open release directory
start "" "%RELEASE_DIR%"

pause