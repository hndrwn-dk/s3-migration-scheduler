@echo off
setlocal enabledelayedexpansion

echo ================================================================
echo  Windows Build - No Icons (Quick Fix)
echo ================================================================
echo.

:: Check if we're in electron-app directory
if not exist "package.json" (
    echo [ERROR] Run this from electron-app directory!
    echo Current directory: %CD%
    pause
    exit /b 1
)

:: Step 1: Backup package.json
echo [INFO] Step 1: Backing up package.json...
copy "package.json" "package.json.iconbackup" >nul
if !errorlevel! neq 0 (
    echo [ERROR] Failed to backup package.json
    pause
    exit /b 1
)

:: Step 2: Remove icon references using PowerShell
echo [INFO] Step 2: Temporarily removing icon references...
powershell -Command ^
    "$content = Get-Content 'package.json' | Where-Object { $_ -notmatch '\"icon\":|\"installerIcon\":|\"uninstallerIcon\":|\"installerHeaderIcon\":' }; $content | Set-Content 'package.json.temp'"

if !errorlevel! neq 0 (
    echo [ERROR] Failed to remove icon references
    copy "package.json.iconbackup" "package.json" >nul
    pause
    exit /b 1
)

:: Step 3: Replace package.json
del "package.json"
ren "package.json.temp" "package.json"

:: Step 4: Build without icons
echo [INFO] Step 3: Building Windows application (no custom icons)...
echo [INFO] This will take 5-10 minutes...
npx electron-builder --win
set BUILD_RESULT=!errorlevel!

:: Step 5: Restore original package.json
echo [INFO] Step 4: Restoring original package.json...
copy "package.json.iconbackup" "package.json" >nul
del "package.json.iconbackup" >nul 2>&1

:: Step 6: Check results
if !BUILD_RESULT! equ 0 (
    echo.
    echo ================================================================
    echo 🎉 BUILD SUCCESSFUL! 🎉
    echo ================================================================
    echo.
    echo Your Windows application is ready in: dist\
    echo.
    if exist "dist\*.exe" (
        echo 📦 Generated files:
        dir "dist\*.exe" /b
        echo.
        echo ✅ Your app packages are ready to distribute!
    )
    echo.
    echo Note: Using default Electron icons (custom icons can be added later)
    echo.
) else (
    echo.
    echo ================================================================
    echo ❌ BUILD FAILED ❌
    echo ================================================================
    echo.
    echo Check the output above for details.
    echo.
)

echo Press any key to exit...
pause >nul
exit /b !BUILD_RESULT!