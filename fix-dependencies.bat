@echo off

echo Fixing S3 Migration Dashboard Dependencies...
echo ===============================================
echo.

echo Installing root dependencies (including concurrently)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install root dependencies
    echo Please check your Node.js and npm installation
    pause
    exit /b 1
)
echo [SUCCESS] Root dependencies installed successfully

echo.
echo Installing server dependencies...
cd server
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install server dependencies
    cd ..
    pause
    exit /b 1
)
echo [SUCCESS] Server dependencies installed successfully
cd ..

echo.
echo Installing client dependencies...
cd client
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install client dependencies
    cd ..
    pause
    exit /b 1
)
echo [SUCCESS] Client dependencies installed successfully
cd ..

echo.
echo [SUCCESS] All dependencies installed successfully!
echo You can now run: start.bat
echo.
pause