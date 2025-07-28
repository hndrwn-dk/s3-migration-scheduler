@echo off
setlocal enabledelayedexpansion

REM S3 Migration Dashboard - Windows Setup Script
REM This script sets up the development environment on Windows

echo S3 Migration Dashboard - Windows Setup
echo ========================================
echo.

REM Check if running on Windows
if not "%OS%"=="Windows_NT" (
    echo [ERROR] This script is designed for Windows. For Linux, use scripts/setup-linux.sh
    pause
    exit /b 1
)

REM Step 1: Check prerequisites
echo =^> Checking prerequisites...
echo.

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18.x or later from: https://nodejs.org/
    echo Make sure to add Node.js to your PATH during installation
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [INFO] Node.js found: !NODE_VERSION!
)

REM Check npm
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed
    echo Please install npm along with Node.js
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [INFO] npm found: !NPM_VERSION!
)

REM Check MinIO client (optional)
mc --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [WARN] MinIO client ^(mc^) not found
    echo Migrations will not work without MinIO client. To install:
    echo.
    echo   1. Download from: https://dl.min.io/client/mc/release/windows-amd64/mc.exe
    echo   2. Rename to mc.exe and add to your PATH
    echo   3. Or use: winget install MinIO.MinIOClient
    echo.
    echo Visit: https://docs.min.io/docs/minio-client-quickstart-guide.html
    echo.
) else (
    for /f "tokens=*" %%i in ('mc --version ^| findstr /r "^mc version"') do set MC_VERSION=%%i
    echo [INFO] MinIO client found: !MC_VERSION!
)

REM Step 2: Install root dependencies
echo.
echo =^> Installing root dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)
echo [INFO] Root dependencies installed successfully

REM Step 3: Install server dependencies
echo.
echo =^> Installing server dependencies...
cd server
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install server dependencies
    pause
    exit /b 1
)
echo [INFO] Server dependencies installed successfully
cd ..

REM Step 4: Install client dependencies
echo.
echo =^> Installing client dependencies...
cd client
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to install client dependencies
    pause
    exit /b 1
)
echo [INFO] Client dependencies installed successfully
cd ..

REM Step 5: Setup environment configuration
echo.
echo =^> Setting up environment configuration...

REM Create server .env file if it doesn't exist
if not exist "server\.env" (
    if exist "server\.env.example" (
        copy "server\.env.example" "server\.env" >nul
        echo [INFO] Created server\.env from .env.example
    ) else (
        echo [WARN] .env.example not found, creating basic .env file
        (
            echo PORT=5000
            echo NODE_ENV=development
            echo.
            echo # MinIO/S3 Configuration
            echo MC_PATH=mc
            echo LOG_LEVEL=info
            echo MAX_CONCURRENT_MIGRATIONS=3
            echo.
            echo # CORS Configuration
            echo FRONTEND_URL=http://localhost:3000
        ) > "server\.env"
    )
) else (
    echo [INFO] server\.env already exists
)

REM Step 6: Create logs directory
echo.
echo =^> Creating logs directory...
if not exist "server\logs" mkdir "server\logs"
echo [INFO] Created server\logs directory

REM Step 7: Build client for production (optional)
if "%1"=="--production" (
    echo.
    echo =^> Building client for production...
    cd client
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [WARN] Failed to build client for production
    ) else (
        echo [INFO] Client built successfully for production
    )
    cd ..
) else if "%1"=="-p" (
    echo.
    echo =^> Building client for production...
    cd client
    call npm run build
    if %ERRORLEVEL% neq 0 (
        echo [WARN] Failed to build client for production
    ) else (
        echo [INFO] Client built successfully for production
    )
    cd ..
)

REM Step 8: Create start script
echo.
echo =^> Creating start script...
(
    echo @echo off
    echo.
    echo REM S3 Migration Dashboard Startup Script
    echo.
    echo echo 🚀 Starting S3 Migration Dashboard...
    echo.
    echo REM Check if MinIO client is available
    echo mc --version ^>nul 2^>^&1
    echo if %%ERRORLEVEL%% neq 0 ^(
    echo     echo ⚠️  Warning: MinIO client ^(mc^) not found in PATH
    echo     echo    Migrations will not work without MinIO client installed
    echo     echo    Visit: https://docs.min.io/docs/minio-client-quickstart-guide.html
    echo     echo.
    echo ^)
    echo.
    echo REM Start the application
    echo echo 📊 Dashboard will be available at: http://localhost:3000
    echo echo 🔌 API server will be available at: http://localhost:5000
    echo echo.
    echo echo Press Ctrl+C to stop the application
    echo echo.
    echo.
    echo call npm run dev
    echo pause
) > start.bat
echo [INFO] Created start.bat script

REM Step 9: Completion message
echo.
echo Setup completed successfully!
echo.
echo Next steps:
echo    1. Configure your S3 endpoints in the dashboard
echo    2. Start the application: start.bat
echo    3. Open browser: http://localhost:3000
echo.

mc --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Don't forget to install MinIO client for migrations to work:
    echo    Download: https://dl.min.io/client/mc/release/windows-amd64/mc.exe
    echo    Or use: winget install MinIO.MinIOClient
    echo.
)

echo For more information, see README.md
echo.
echo Press any key to exit...
pause >nul