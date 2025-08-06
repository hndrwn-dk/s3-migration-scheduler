@echo off
setlocal enabledelayedexpansion

REM S3 Migration Scheduler - Windows Build Script (Debug Version)
REM This script helps diagnose build issues

echo.
echo ================================================================
echo  S3 Migration Scheduler - Windows Build Script (DEBUG)
echo ================================================================
echo.

REM Configuration
set "BUILD_DIR=%~dp0..\build"
set "ELECTRON_DIR=%~dp0..\electron-app"
set "CLIENT_DIR=%~dp0..\client"
set "SERVER_DIR=%~dp0..\server"
set "DIST_DIR=%~dp0..\dist"

echo [DEBUG] Script directory: %~dp0
echo [DEBUG] Build directory: %BUILD_DIR%
echo [DEBUG] Electron directory: %ELECTRON_DIR%
echo [DEBUG] Client directory: %CLIENT_DIR%
echo [DEBUG] Server directory: %SERVER_DIR%
echo [DEBUG] Dist directory: %DIST_DIR%
echo.

REM Helper functions
:log_info
echo [92m[INFO][0m %~1
goto :eof

:log_warn
echo [93m[WARN][0m %~1
goto :eof

:log_error
echo [91m[ERROR][0m %~1
goto :eof

:log_debug
echo [96m[DEBUG][0m %~1
goto :eof

:check_prerequisites
call :log_info "Checking prerequisites..."

REM Check current directory
call :log_debug "Current directory: %CD%"

REM Check if we're in the right location
if not exist "%CLIENT_DIR%" (
    call :log_error "Client directory not found: %CLIENT_DIR%"
    call :log_error "Are you running this from the project root?"
    exit /b 1
)

if not exist "%SERVER_DIR%" (
    call :log_error "Server directory not found: %SERVER_DIR%"
    call :log_error "Are you running this from the project root?"
    exit /b 1
)

if not exist "%ELECTRON_DIR%" (
    call :log_error "Electron directory not found: %ELECTRON_DIR%"
    call :log_error "Are you running this from the project root?"
    exit /b 1
)

REM Check Node.js
call :log_debug "Checking Node.js..."
node --version >nul 2>&1
if errorlevel 1 (
    call :log_error "Node.js is not installed or not in PATH"
    call :log_error "Please install Node.js 16+ from https://nodejs.org"
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    call :log_info "Node.js version: !NODE_VERSION!"
)

REM Check npm
call :log_debug "Checking npm..."
npm --version >nul 2>&1
if errorlevel 1 (
    call :log_error "npm is not installed or not in PATH"
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    call :log_info "npm version: !NPM_VERSION!"
)

REM Check if package.json exists in electron-app
if not exist "%ELECTRON_DIR%\package.json" (
    call :log_error "package.json not found in electron-app directory"
    call :log_error "Expected: %ELECTRON_DIR%\package.json"
    exit /b 1
) else (
    call :log_debug "Found electron-app package.json"
)

REM Check if package.json exists in client
if not exist "%CLIENT_DIR%\package.json" (
    call :log_error "package.json not found in client directory"
    call :log_error "Expected: %CLIENT_DIR%\package.json"
    exit /b 1
) else (
    call :log_debug "Found client package.json"
)

call :log_info "All prerequisites check passed!"
goto :eof

:setup_directories
call :log_info "Setting up build directories..."

REM Create directories
if not exist "%BUILD_DIR%" (
    call :log_debug "Creating build directory: %BUILD_DIR%"
    mkdir "%BUILD_DIR%"
)

if not exist "%DIST_DIR%" (
    call :log_debug "Creating dist directory: %DIST_DIR%"
    mkdir "%DIST_DIR%"
)

REM Clean previous builds
if exist "%ELECTRON_DIR%\dist" (
    call :log_info "Cleaning previous Electron builds..."
    rmdir /s /q "%ELECTRON_DIR%\dist"
)

call :log_debug "Directory setup completed"
goto :eof

:check_dependencies
call :log_info "Checking dependencies..."

REM Check client dependencies
cd /d "%CLIENT_DIR%"
if not exist "node_modules" (
    call :log_warn "Client dependencies not installed"
    call :log_info "Installing client dependencies..."
    npm install
    if errorlevel 1 (
        call :log_error "Failed to install client dependencies"
        exit /b 1
    )
) else (
    call :log_debug "Client dependencies already installed"
)

REM Check electron dependencies
cd /d "%ELECTRON_DIR%"
if not exist "node_modules" (
    call :log_warn "Electron dependencies not installed"
    call :log_info "Installing electron dependencies..."
    npm install
    if errorlevel 1 (
        call :log_error "Failed to install electron dependencies"
        exit /b 1
    )
) else (
    call :log_debug "Electron dependencies already installed"
)

call :log_info "Dependencies check completed"
goto :eof

:build_frontend
call :log_info "Building React frontend..."

cd /d "%CLIENT_DIR%"
call :log_debug "Changed to client directory: %CD%"

REM Build the frontend
call :log_debug "Running npm run build..."
npm run build
if errorlevel 1 (
    call :log_error "Frontend build failed"
    exit /b 1
)

REM Check if build directory was created
if not exist "build" (
    call :log_error "Frontend build directory not created"
    exit /b 1
) else (
    call :log_debug "Frontend build completed successfully"
)

goto :eof

:copy_frontend_to_electron
call :log_info "Copying frontend build to Electron app..."

REM Copy built frontend to electron app
if exist "%ELECTRON_DIR%\build" (
    call :log_debug "Removing old frontend files from electron app..."
    rmdir /s /q "%ELECTRON_DIR%\build"
)

call :log_debug "Copying frontend files..."
xcopy "%CLIENT_DIR%\build" "%ELECTRON_DIR%\build" /E /I /Y
if errorlevel 1 (
    call :log_error "Failed to copy frontend files to electron app"
    exit /b 1
)

call :log_debug "Frontend copy completed"
goto :eof

:build_electron_app
call :log_info "Building Electron application..."

cd /d "%ELECTRON_DIR%"
call :log_debug "Changed to electron directory: %CD%"

REM Run electron-builder
call :log_debug "Running electron-builder for Windows..."
npx electron-builder --win
if errorlevel 1 (
    call :log_error "Electron build failed"
    exit /b 1
)

call :log_debug "Electron build completed"
goto :eof

:show_results
call :log_info "Build completed! Checking results..."

cd /d "%~dp0.."
if exist "dist" (
    call :log_info "Generated files in dist directory:"
    dir "dist" /b
) else (
    call :log_error "No dist directory found!"
)

if exist "%ELECTRON_DIR%\dist" (
    call :log_info "Generated files in electron-app/dist directory:"
    dir "%ELECTRON_DIR%\dist" /b
    
    REM Copy files to main dist directory
    if not exist "dist" mkdir "dist"
    xcopy "%ELECTRON_DIR%\dist\*" "dist\" /Y
    call :log_info "Files copied to main dist directory"
)

goto :eof

REM Main execution
:main
call :log_info "Starting Windows build process..."

call :check_prerequisites
if errorlevel 1 (
    call :log_error "Prerequisites check failed"
    pause
    exit /b 1
)

call :setup_directories
call :check_dependencies
if errorlevel 1 (
    call :log_error "Dependencies check failed"
    pause
    exit /b 1
)

call :build_frontend
if errorlevel 1 (
    call :log_error "Frontend build failed"
    pause
    exit /b 1
)

call :copy_frontend_to_electron
if errorlevel 1 (
    call :log_error "Frontend copy failed"
    pause
    exit /b 1
)

call :build_electron_app
if errorlevel 1 (
    call :log_error "Electron build failed"
    pause
    exit /b 1
)

call :show_results

echo.
call :log_info "Build process completed successfully!"
echo.
pause
goto :eof

REM Start main execution
call :main