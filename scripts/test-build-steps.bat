@echo off
echo ================================================================
echo  Testing Build Steps One by One
echo ================================================================
echo.

echo [TEST 1] Checking current directory...
echo Current directory: %CD%
if not exist "client" (
    echo [ERROR] Client directory not found
    pause
    exit /b 1
)
echo [OK] Client directory exists
echo.

echo [TEST 2] Testing root npm install...
npm install >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Root npm install failed
    echo Trying with verbose output:
    npm install
    pause
    exit /b 1
)
echo [OK] Root npm install succeeded
echo.

echo [TEST 3] Testing client directory access...
cd client
if errorlevel 1 (
    echo [ERROR] Cannot access client directory
    pause
    exit /b 1
)
echo [OK] Client directory accessible
echo.

echo [TEST 4] Testing client npm install...
npm install >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Client npm install failed
    echo Trying with verbose output:
    npm install
    cd ..
    pause
    exit /b 1
)
echo [OK] Client npm install succeeded
echo.

echo [TEST 5] Testing client build...
npm run build >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Client build failed
    echo Trying with verbose output:
    npm run build
    cd ..
    pause
    exit /b 1
)
echo [OK] Client build succeeded
cd ..
echo.

echo [TEST 6] Testing electron directory access...
cd electron-app
if errorlevel 1 (
    echo [ERROR] Cannot access electron-app directory
    pause
    exit /b 1
)
echo [OK] Electron-app directory accessible
echo.

echo [TEST 7] Testing electron npm install...
npm install >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Electron npm install failed
    echo Trying with verbose output:
    npm install
    cd ..
    pause
    exit /b 1
)
echo [OK] Electron npm install succeeded
echo.

echo [TEST 8] Testing file copy...
if exist "build" rmdir /s /q "build" >nul 2>&1
robocopy "..\client\build" "build" /E /NFL /NDL /NJH /NJS >nul 2>&1
if not exist "build" (
    echo [ERROR] File copy failed
    cd ..
    pause
    exit /b 1
)
echo [OK] File copy succeeded
echo.

echo [TEST 9] Testing electron-builder...
echo This will take several minutes...
npx electron-builder --win
if errorlevel 1 (
    echo [ERROR] Electron-builder failed
    cd ..
    pause
    exit /b 1
)
echo [OK] Electron-builder succeeded
cd ..
echo.

echo ================================================================
echo  ALL TESTS PASSED! Build should work now.
echo ================================================================
echo.
if exist "electron-app\dist" (
    echo Generated files:
    dir "electron-app\dist" /b
)
pause