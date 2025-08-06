@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo  Complete Windows Build (SQLite-Free)
echo ================================================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Not in project root! Please run from s3-migration-scheduler directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

:: Step 1: Go to electron-app directory
echo [INFO] Step 1: Navigating to electron-app directory...
cd electron-app
if not exist "package.json" (
    echo [ERROR] electron-app/package.json not found!
    pause
    exit /b 1
)

:: Step 2: Backup original package.json
echo [INFO] Step 2: Backing up original package.json...
if exist "package.json.backup" del "package.json.backup"
copy "package.json" "package.json.backup" >nul
if !errorlevel! neq 0 (
    echo [ERROR] Failed to backup package.json
    pause
    exit /b 1
)

:: Step 3: Create SQLite-free package.json
echo [INFO] Step 3: Creating SQLite-free package.json...
powershell -Command "(Get-Content 'package.json') -replace '.*better-sqlite3.*,?' -replace ',(\s*})' ,'$1' | Set-Content 'package.json.temp'"
if !errorlevel! neq 0 (
    echo [ERROR] Failed to create SQLite-free package.json
    pause
    exit /b 1
)

:: Step 4: Replace package.json
echo [INFO] Step 4: Replacing package.json...
del "package.json"
ren "package.json.temp" "package.json"

:: Step 5: Complete cleanup
echo [INFO] Step 5: Complete cleanup (node_modules, package-lock, cache)...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del "package-lock.json"
if exist "dist" rmdir /s /q "dist"
npm cache clean --force >nul 2>&1

:: Step 6: Fresh install
echo [INFO] Step 6: Fresh installation of dependencies...
npm install
if !errorlevel! neq 0 (
    echo [ERROR] npm install failed
    echo [INFO] Restoring original package.json...
    copy "package.json.backup" "package.json" >nul
    pause
    exit /b 1
)

:: Step 7: Verify no SQLite in node_modules
echo [INFO] Step 7: Verifying SQLite removal...
if exist "node_modules\better-sqlite3" (
    echo [WARNING] better-sqlite3 still exists, removing manually...
    rmdir /s /q "node_modules\better-sqlite3"
)

:: Step 8: Copy frontend build
echo [INFO] Step 8: Ensuring frontend build is available...
if not exist "build" (
    if exist "..\client\build" (
        echo [INFO] Copying frontend build...
        xcopy "..\client\build" "build" /e /i /h /y >nul
    ) else (
        echo [ERROR] Frontend build not found! Please build client first:
        echo   cd ..\client
        echo   npm install
        echo   npm run build
        echo   cd ..\electron-app
        copy "package.json.backup" "package.json" >nul
        pause
        exit /b 1
    )
)

:: Step 9: Build Windows application
echo [INFO] Step 9: Building Windows application...
echo [INFO] This will take 5-10 minutes...
npx electron-builder --win --config.npmRebuild=false
set BUILD_RESULT=!errorlevel!

:: Step 10: Restore original package.json
echo [INFO] Step 10: Restoring original package.json...
copy "package.json.backup" "package.json" >nul
del "package.json.backup" >nul 2>&1

:: Step 11: Check results
if !BUILD_RESULT! equ 0 (
    echo.
    echo ================================================================
    echo 🎉 BUILD SUCCESSFUL! 🎉
    echo ================================================================
    echo.
    echo Your Windows application is ready in: electron-app\dist\
    echo.
    if exist "dist\*.exe" (
        echo 📦 Generated files:
        dir "dist\*.exe" /b
        echo.
        echo ✅ Professional installer: *Setup*.exe
        echo ✅ Portable application: *.exe (without "Setup")
    )
    echo.
    echo You can now distribute these .exe files to Windows users!
    echo.
) else (
    echo.
    echo ================================================================
    echo ❌ BUILD FAILED ❌
    echo ================================================================
    echo.
    echo The build process encountered an error.
    echo Please check the output above for details.
    echo.
)

echo Press any key to exit...
pause >nul
exit /b !BUILD_RESULT!