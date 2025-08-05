@echo off
setlocal enabledelayedexpansion

REM S3 Migration Scheduler - Windows Build Script
REM This script builds Windows desktop packages

echo.
echo ================================================================
echo  S3 Migration Scheduler - Windows Build Script
echo ================================================================
echo.

REM Configuration
set "BUILD_DIR=%~dp0..\build"
set "ELECTRON_DIR=%~dp0..\electron-app"
set "CLIENT_DIR=%~dp0..\client"
set "SERVER_DIR=%~dp0..\server"
set "DIST_DIR=%~dp0..\dist"

REM Colors (if supported)
set "COLOR_GREEN=[92m"
set "COLOR_YELLOW=[93m"
set "COLOR_RED=[91m"
set "COLOR_RESET=[0m"

REM Helper functions
:log_info
echo %COLOR_GREEN%[INFO]%COLOR_RESET% %~1
goto :eof

:log_warn
echo %COLOR_YELLOW%[WARN]%COLOR_RESET% %~1
goto :eof

:log_error
echo %COLOR_RED%[ERROR]%COLOR_RESET% %~1
goto :eof

:check_prerequisites
call :log_info "Checking prerequisites..."

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Node.js is not installed or not in PATH"
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    call :log_error "npm is not installed or not in PATH"
    exit /b 1
)

call :log_info "Prerequisites check passed"
goto :eof

:setup_directories
call :log_info "Setting up build directories..."

REM Create directories
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

REM Clean previous builds
if exist "%ELECTRON_DIR%\dist" (
    call :log_info "Cleaning previous Electron builds..."
    rmdir /s /q "%ELECTRON_DIR%\dist"
)

goto :eof

:build_frontend
call :log_info "Building React frontend..."

cd /d "%CLIENT_DIR%"
if not exist "node_modules" (
    call :log_info "Installing frontend dependencies..."
    npm install
    if errorlevel 1 (
        call :log_error "Failed to install frontend dependencies"
        exit /b 1
    )
)

call :log_info "Building production frontend..."
npm run build
if errorlevel 1 (
    call :log_error "Failed to build frontend"
    exit /b 1
)

call :log_info "Frontend build completed"
goto :eof

:prepare_electron
call :log_info "Preparing Electron application..."

cd /d "%ELECTRON_DIR%"

REM Install Electron dependencies
if not exist "node_modules" (
    call :log_info "Installing Electron dependencies..."
    npm install
    if errorlevel 1 (
        call :log_error "Failed to install Electron dependencies"
        exit /b 1
    )
)

REM Copy built frontend to Electron resources
call :log_info "Copying frontend build to Electron resources..."
if exist "resources\client" rmdir /s /q "resources\client"
mkdir "resources\client"
xcopy /e /i /y "%CLIENT_DIR%\build\*" "resources\client\"

REM Copy server files
call :log_info "Copying server files to Electron resources..."
if exist "resources\server" rmdir /s /q "resources\server"
mkdir "resources\server"
xcopy /e /i /y "%SERVER_DIR%\*" "resources\server\"

REM Install server dependencies in the copied location
cd /d "resources\server"
call :log_info "Installing server dependencies for packaging..."
npm install --production
if errorlevel 1 (
    call :log_error "Failed to install server dependencies"
    exit /b 1
)

cd /d "%ELECTRON_DIR%"
goto :eof

:build_electron_packages
call :log_info "Building Electron packages..."

cd /d "%ELECTRON_DIR%"

REM Build all Windows targets
call :log_info "Building Windows installer (NSIS)..."
npx electron-builder --win nsis
if errorlevel 1 (
    call :log_error "Failed to build Windows installer"
    exit /b 1
)

call :log_info "Building Windows portable version..."
npx electron-builder --win portable
if errorlevel 1 (
    call :log_error "Failed to build Windows portable"
    exit /b 1
)

call :log_info "Building Windows ZIP package..."
npx electron-builder --win zip
if errorlevel 1 (
    call :log_error "Failed to build Windows ZIP"
    exit /b 1
)

call :log_info "All Electron packages built successfully"
goto :eof

:create_portable_script
call :log_info "Creating portable script package..."

REM Create a standalone script-based package for users who prefer scripts
set "PORTABLE_DIR=%DIST_DIR%\S3-Migration-Scheduler-Portable"
if exist "%PORTABLE_DIR%" rmdir /s /q "%PORTABLE_DIR%"
mkdir "%PORTABLE_DIR%"

REM Copy necessary files
xcopy /e /i /y "%CLIENT_DIR%\build\*" "%PORTABLE_DIR%\client\"
xcopy /e /i /y "%SERVER_DIR%\*" "%PORTABLE_DIR%\server\"
copy "%~dp0..\mc.exe" "%PORTABLE_DIR%\"

REM Create startup script
(
echo @echo off
echo setlocal
echo.
echo echo Starting S3 Migration Scheduler...
echo echo.
echo.
echo REM Set environment variables
echo set NODE_ENV=production
echo set PORT=5000
echo set DB_PATH=%%~dp0data\migrations.db
echo set MC_PATH=%%~dp0mc.exe
echo.
echo REM Create data directories
echo if not exist "%%~dp0data" mkdir "%%~dp0data"
echo if not exist "%%~dp0logs" mkdir "%%~dp0logs"
echo.
echo REM Install server dependencies if needed
echo cd /d "%%~dp0server"
echo if not exist "node_modules" ^(
echo     echo Installing dependencies...
echo     npm install --production
echo ^)
echo.
echo REM Start the server
echo echo Starting server on http://localhost:5000
echo start /b node index.js
echo.
echo REM Wait a moment for server to start
echo timeout /t 3 /nobreak ^>nul
echo.
echo REM Open browser
echo echo Opening application in browser...
echo start http://localhost:5000
echo.
echo echo.
echo echo S3 Migration Scheduler is now running!
echo echo Close this window to stop the application.
echo echo.
echo pause
) > "%PORTABLE_DIR%\Start-S3-Migration-Scheduler.bat"

REM Create README for portable version
(
echo S3 Migration Scheduler - Portable Version
echo ========================================
echo.
echo To start the application:
echo 1. Double-click "Start-S3-Migration-Scheduler.bat"
echo 2. Wait for the server to start
echo 3. The application will open in your default browser
echo.
echo Requirements:
echo - Node.js installed on your system
echo - Internet connection for initial dependency installation
echo.
echo Data Location:
echo - Database: data\migrations.db
echo - Logs: logs\
echo.
echo For support, visit: https://github.com/hndrwn-dk/s3-migration-scheduler
) > "%PORTABLE_DIR%\README.txt"

call :log_info "Portable script package created in %PORTABLE_DIR%"
goto :eof

:copy_artifacts
call :log_info "Copying build artifacts..."

REM Copy Electron builds
if exist "%ELECTRON_DIR%\dist" (
    xcopy /e /y "%ELECTRON_DIR%\dist\*" "%DIST_DIR%\"
)

goto :eof

:show_results
call :log_info "Build completed successfully!"
echo.
echo ================================================================
echo  Build Results
echo ================================================================
echo.
echo Build artifacts are available in: %DIST_DIR%
echo.

REM List the created files
if exist "%DIST_DIR%" (
    echo Available packages:
    for %%f in ("%DIST_DIR%\*.exe") do echo   - %%~nxf
    for %%f in ("%DIST_DIR%\*.zip") do echo   - %%~nxf
    if exist "%DIST_DIR%\S3-Migration-Scheduler-Portable" echo   - S3-Migration-Scheduler-Portable (script-based)
)

echo.
echo Installation options:
echo   1. Run the .exe installer for full Windows integration
echo   2. Extract the portable .exe for standalone use
echo   3. Use the script-based portable version if you have Node.js
echo.
goto :eof

REM Main execution
:main
call :check_prerequisites
if errorlevel 1 exit /b 1

call :setup_directories
call :build_frontend
if errorlevel 1 exit /b 1

call :prepare_electron
if errorlevel 1 exit /b 1

call :build_electron_packages
if errorlevel 1 exit /b 1

call :create_portable_script
call :copy_artifacts
call :show_results

echo Build process completed successfully!
echo.
pause
goto :eof

REM Start main execution
call :main