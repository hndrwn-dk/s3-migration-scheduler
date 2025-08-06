@echo off
echo ================================================================
echo  Complete Build Test - All Steps
echo ================================================================
echo.

echo [TEST 1] Checking directories...
if not exist "client" (
    echo [ERROR] Client directory not found
    pause & exit /b 1
)
if not exist "electron-app" (
    echo [ERROR] Electron-app directory not found
    pause & exit /b 1
)
echo [OK] All directories exist
echo.

echo [TEST 2] Root npm install...
npm install
if errorlevel 1 (
    echo [ERROR] Root npm install failed
    pause & exit /b 1
)
echo [OK] Root npm install completed
echo.

echo [TEST 3] Client npm install...
cd client
npm install
if errorlevel 1 (
    echo [ERROR] Client npm install failed
    cd .. & pause & exit /b 1
)
echo [OK] Client npm install completed
echo.

echo [TEST 4] Building React frontend...
npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed
    cd .. & pause & exit /b 1
)
echo [OK] Frontend build completed
cd ..
echo.

echo [TEST 5] Electron npm install...
cd electron-app
npm install
if errorlevel 1 (
    echo [ERROR] Electron npm install failed
    cd .. & pause & exit /b 1
)
echo [OK] Electron npm install completed
echo.

echo [TEST 6] Copying frontend files...
if exist "build" rmdir /s /q "build"
robocopy "..\client\build" "build" /E /NFL /NDL /NJH /NJS
if not exist "build\index.html" (
    echo [ERROR] Frontend copy failed - index.html not found
    cd .. & pause & exit /b 1
)
echo [OK] Frontend files copied successfully
echo.

echo [TEST 7] Building Windows application...
echo This will take several minutes, please wait...
npx electron-builder --win
if errorlevel 1 (
    echo [ERROR] Electron builder failed
    cd .. & pause & exit /b 1
)
echo [OK] Windows application built successfully
cd ..
echo.

echo [TEST 8] Checking results...
if exist "electron-app\dist" (
    echo [SUCCESS] Build completed! Files created:
    dir "electron-app\dist" /b
    echo.
    
    echo [INFO] Copying to main dist directory...
    if not exist "dist" mkdir "dist"
    xcopy "electron-app\dist\*" "dist\" /Y /Q
    
    echo [SUCCESS] Windows packages ready in dist directory:
    if exist "dist\*.exe" (
        for %%f in (dist\*.exe) do (
            echo   📦 %%~nxf
        )
    )
) else (
    echo [ERROR] No build output found
    pause & exit /b 1
)

echo.
echo ================================================================
echo  ✅ ALL TESTS PASSED! WINDOWS APPLICATION BUILT SUCCESSFULLY!
echo ================================================================
echo.
echo Your Windows packages are ready in the dist\ folder!
pause