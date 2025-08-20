@echo off
REM S3 Migration Scheduler - Windows Desktop Build Script
REM This script builds Windows desktop packages (.exe installer and .zip portable)

setlocal enabledelayedexpansion

REM Configuration
set VERSION=1.1.0

echo.
echo =========================================================================
echo                  S3 Migration Scheduler - Windows Build                  
echo                              Version %VERSION%                              
echo =========================================================================
echo.

REM Get script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..\..

echo Project root: %PROJECT_ROOT%
echo.

REM Step 1: Verify prerequisites
echo Step 1: Checking Prerequisites...
echo ======================================

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    pause
    exit /b 1
)
echo + Node.js found

REM Check npm
echo Checking npm...
where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)
echo + npm found

echo.
echo Continuing to Step 2...

REM Step 2: Build React client (if not already built)
echo Step 2: Ensuring React Client is Built...
echo ===========================================

cd /d "%PROJECT_ROOT%\client"

if not exist "build\index.html" (
    echo React client not found, building...
    npm install
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install client dependencies
        pause
        exit /b 1
    )
    
    npm run build
    if !errorlevel! neq 0 (
        echo ERROR: Failed to build React client
        pause
        exit /b 1
    )
    echo + React client built successfully
) else (
    echo + React client already built
)

echo.

REM Step 3: Build Windows desktop packages
echo Step 3: Building Windows Desktop Packages...
echo =============================================

cd /d "%PROJECT_ROOT%\electron-app"

REM Install electron dependencies if needed
if not exist "node_modules" (
    echo Installing electron app dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install electron app dependencies
        pause
        exit /b 1
    )
)

REM Ensure server dependencies are installed
echo Installing server dependencies...
cd /d "%PROJECT_ROOT%\server"
npm install --production
if !errorlevel! neq 0 (
    echo ERROR: Failed to install server dependencies
    pause
    exit /b 1
)
echo + Server dependencies installed

cd /d "%PROJECT_ROOT%\electron-app"

echo Building Windows packages...
npm run build:win
if !errorlevel! neq 0 (
    echo ERROR: Failed to build Windows packages
    pause
    exit /b 1
)

echo + Windows packages built successfully
echo.

REM Step 4: List built assets
echo Step 4: Build Results...
echo ========================

echo.
echo BUILD COMPLETED SUCCESSFULLY!
echo.

if exist "dist" (
    echo Windows Desktop Packages:
    echo -------------------------
    dir /b "dist\*.exe" 2>nul | findstr /r ".*" >nul && (
        for %%f in (dist\*.exe) do echo   + %%~nxf ^(installer^)
    )
    dir /b "dist\*.zip" 2>nul | findstr /r ".*" >nul && (
        for %%f in (dist\*.zip) do echo   + %%~nxf ^(portable^)
    )
    echo.
    
    echo Built files location: %PROJECT_ROOT%\electron-app\dist%
    echo.
    
    choice /c YN /m "Open dist directory in Explorer? "
    if !errorlevel! equ 1 (
        start explorer "dist"
    )
) else (
    echo ERROR: No dist directory found
)

echo.
echo =========================================================================
echo                     WINDOWS BUILD SCRIPT COMPLETED                     
echo                              Version %VERSION%                              
echo =========================================================================
echo.

pause