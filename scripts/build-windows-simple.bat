@echo off
echo.
echo ================================================================
echo  S3 Migration Scheduler - Simple Windows Build Script
echo ================================================================
echo.

REM Check if we're in the right directory
if not exist "client" (
    echo [ERROR] Client directory not found. Please run from project root.
    echo Current directory: %CD%
    pause
    exit /b 1
)

if not exist "electron-app" (
    echo [ERROR] Electron-app directory not found. Please run from project root.
    pause
    exit /b 1
)

echo [INFO] Checking Node.js...
node --version
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 16+ from https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Checking npm...
npm --version
if errorlevel 1 (
    echo [ERROR] npm not found.
    pause
    exit /b 1
)

echo.
echo [INFO] Step 1: Installing root dependencies...
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

echo.
echo [INFO] Step 2: Installing client dependencies...
cd client
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install client dependencies
    cd ..
    pause
    exit /b 1
)

echo.
echo [INFO] Step 3: Building React frontend...
npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    cd ..
    pause
    exit /b 1
)

echo.
echo [INFO] Step 4: Installing Electron dependencies...
cd ..\electron-app
npm install
if errorlevel 1 (
    echo [ERROR] Failed to install electron dependencies
    cd ..
    pause
    exit /b 1
)

echo.
echo [INFO] Step 5: Copying frontend to Electron app...
if exist "build" rmdir /s /q "build"
robocopy "..\client\build" "build" /E /NFL /NDL /NJH /NJS
if errorlevel 8 (
    echo [ERROR] Failed to copy frontend files
    cd ..
    pause
    exit /b 1
)

echo.
echo [INFO] Step 6: Building Windows application...
echo This may take several minutes...
npx electron-builder --win
if errorlevel 1 (
    echo [ERROR] Electron build failed
    cd ..
    pause
    exit /b 1
)

echo.
echo [INFO] Step 7: Checking build results...
cd ..
if exist "electron-app\dist" (
    echo [SUCCESS] Build completed! Generated files:
    dir "electron-app\dist" /b
    
    echo.
    echo [INFO] Copying files to main dist directory...
    if not exist "dist" mkdir "dist"
    xcopy "electron-app\dist\*" "dist\" /Y /Q
    
    echo.
    echo [SUCCESS] Windows application packages created in dist\ directory:
    dir "dist" /b
) else (
    echo [ERROR] No build output found in electron-app\dist
)

echo.
echo ================================================================
echo  BUILD PROCESS COMPLETED!
echo ================================================================
echo.
echo Your Windows application packages are ready in the dist\ folder:
echo.
if exist "dist\*.exe" (
    for %%f in (dist\*.exe) do echo  - %%~nxf
)
echo.
pause