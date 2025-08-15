@echo off
REM S3 Migration Scheduler - Windows Desktop Build Script
REM This script builds Windows desktop packages (.exe installer and .zip portable)

setlocal enabledelayedexpansion

REM Configuration
set VERSION=1.1.0

REM Colors for output
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set BLUE=[94m
set NC=[0m

echo.
echo %BLUE%=========================================================================%NC%
echo %BLUE%                  S3 Migration Scheduler - Windows Build                  %NC%
echo %BLUE%                              Version %VERSION%                              %NC%
echo %BLUE%=========================================================================%NC%
echo.

REM Get script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..\..

echo %YELLOW%Project root: %PROJECT_ROOT%%NC%
echo.

REM Step 1: Verify prerequisites
echo %BLUE%Step 1: Checking Prerequisites...%NC%
echo ======================================

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    echo %RED%ERROR: Node.js is not installed or not in PATH%NC%
    pause
    exit /b 1
)
echo %GREEN%+ Node.js found%NC%

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
set NPM_ERROR=!errorlevel!
echo npm check returned: !NPM_ERROR!
if !NPM_ERROR! neq 0 (
    echo %RED%ERROR: npm is not installed or not in PATH%NC%
    echo Trying to show npm version for debugging...
    npm --version
    pause
    exit /b 1
)
echo %GREEN%+ npm found%NC%

echo.
echo Continuing to Step 2...

REM Step 2: Build React client (if not already built)
echo %BLUE%Step 2: Ensuring React Client is Built...%NC%
echo ===========================================

cd /d "%PROJECT_ROOT%\client"

if not exist "build\index.html" (
    echo React client not found, building...
    npm install
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to install client dependencies%NC%
        pause
        exit /b 1
    )
    
    npm run build
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to build React client%NC%
        pause
        exit /b 1
    )
    echo %GREEN%+ React client built successfully%NC%
) else (
    echo %GREEN%+ React client already built%NC%
)

echo.

REM Step 3: Build Windows desktop packages
echo %BLUE%Step 3: Building Windows Desktop Packages...%NC%
echo =============================================

cd /d "%PROJECT_ROOT%\electron-app"

REM Install electron dependencies if needed
if not exist "node_modules" (
    echo Installing electron app dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo %RED%ERROR: Failed to install electron app dependencies%NC%
        pause
        exit /b 1
    )
)

echo Building Windows packages...
npm run build:win
if !errorlevel! neq 0 (
    echo %RED%ERROR: Failed to build Windows packages%NC%
    pause
    exit /b 1
)

echo %GREEN%+ Windows packages built successfully%NC%
echo.

REM Step 4: List built assets
echo %BLUE%Step 4: Build Results...%NC%
echo ========================

echo.
echo %GREEN%BUILD COMPLETED SUCCESSFULLY!%NC%
echo.

if exist "dist" (
    echo %GREEN%Windows Desktop Packages:%NC%
    echo -------------------------
    dir /b "dist\*.exe" 2>nul | findstr /r ".*" >nul && (
        for %%f in (dist\*.exe) do echo   + %%~nxf ^(installer^)
    )
    dir /b "dist\*.zip" 2>nul | findstr /r ".*" >nul && (
        for %%f in (dist\*.zip) do echo   + %%~nxf ^(portable^)
    )
    echo.
    
    echo %YELLOW%Built files location: %PROJECT_ROOT%\electron-app\dist\%NC%
    echo.
    
    choice /c YN /m "Open dist directory in Explorer? "
    if !errorlevel! equ 1 (
        start explorer "dist"
    )
) else (
    echo %RED%ERROR: No dist directory found%NC%
)

echo.
echo %GREEN%=========================================================================%NC%
echo %GREEN%                     WINDOWS BUILD SCRIPT COMPLETED                     %NC%
echo %GREEN%                              Version %VERSION%                              %NC%
echo %GREEN%=========================================================================%NC%
echo.

pause