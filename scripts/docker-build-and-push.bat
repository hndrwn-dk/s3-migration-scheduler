@echo off
REM S3 Migration Scheduler - Docker Build and Push Script (Windows)
REM This script builds the Docker image and pushes it to Docker Hub

setlocal enabledelayedexpansion

REM Configuration
set DOCKER_USERNAME=hndrwn
set IMAGE_NAME=s3-migration-scheduler
set VERSION=1.1.0
set LATEST_TAG=latest

REM Full image names
set FULL_IMAGE_NAME=%DOCKER_USERNAME%/%IMAGE_NAME%
set VERSION_TAG=%FULL_IMAGE_NAME%:%VERSION%
set LATEST_TAG_FULL=%FULL_IMAGE_NAME%:%LATEST_TAG%

echo Building and pushing S3 Migration Scheduler v%VERSION% to Docker Hub
echo =======================================================================

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
REM Get the project root (parent of scripts directory)
set PROJECT_ROOT=%SCRIPT_DIR%..
REM Get the client directory
set CLIENT_DIR=%PROJECT_ROOT%\client

echo Script directory: %SCRIPT_DIR%
echo Project root: %PROJECT_ROOT%
echo Client directory: %CLIENT_DIR%

REM Check if Docker is running
echo Step 1: Checking Docker...
docker info >nul 2>&1
if !errorlevel! neq 0 (
    echo ERROR: Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)
echo Docker is running - OK

REM Skip Docker login check since it's problematic on Windows
echo Step 2: Assuming Docker login is configured...
echo If build fails, please run: docker login

REM Check if we're in the right project structure
if not exist "%PROJECT_ROOT%\package.json" (
    echo ERROR: Cannot find package.json in project root: %PROJECT_ROOT%
    echo Please ensure you're running this script from the scripts directory of the s3-migration-scheduler project
    pause
    exit /b 1
)

if not exist "%CLIENT_DIR%\package.json" (
    echo ERROR: Cannot find client package.json in: %CLIENT_DIR%
    echo Please ensure the client directory exists in your project
    pause
    exit /b 1
)

REM Build React client
echo Step 3: Building React client...
echo Navigating to client directory: %CLIENT_DIR%
cd /d "%CLIENT_DIR%"
if !errorlevel! neq 0 (
    echo ERROR: Failed to navigate to client directory
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing client dependencies...
    npm install
    if !errorlevel! neq 0 (
        echo ERROR: Failed to install client dependencies
        pause
        exit /b 1
    )
)

echo Building React application...
npm run build
if !errorlevel! neq 0 (
    echo ERROR: Failed to build React client
    pause
    exit /b 1
)
echo React client built successfully

REM Navigate back to project root for Docker build
echo Navigating back to project root: %PROJECT_ROOT%
cd /d "%PROJECT_ROOT%"
if !errorlevel! neq 0 (
    echo ERROR: Failed to navigate to project root
    pause
    exit /b 1
)

REM Build Docker image
echo Step 4: Building Docker image...
echo Current directory: %CD%
echo Building image: %VERSION_TAG%
docker build -t "%VERSION_TAG%" -t "%LATEST_TAG_FULL%" .
if !errorlevel! neq 0 (
    echo ERROR: Failed to build Docker image
    pause
    exit /b 1
)
echo Docker image built successfully

REM Push to Docker Hub
echo Step 5: Pushing to Docker Hub...
echo Pushing %VERSION_TAG%...
docker push "%VERSION_TAG%"
if !errorlevel! neq 0 (
    echo ERROR: Failed to push version tag. Please check your Docker Hub login.
    echo Run 'docker login' and try again.
    pause
    exit /b 1
)

echo Pushing %LATEST_TAG_FULL%...
docker push "%LATEST_TAG_FULL%"
if !errorlevel! neq 0 (
    echo ERROR: Failed to push latest tag
    pause
    exit /b 1
)

echo Images pushed successfully to Docker Hub!

REM Show success information
echo.
echo SUCCESS! Docker images published to Docker Hub
echo =======================================================================
echo Image: %FULL_IMAGE_NAME%
echo Tags: %VERSION%, %LATEST_TAG%
echo.
echo Quick deployment commands:
echo    docker run -d -p 5000:5000 %VERSION_TAG%
echo    docker-compose up -d
echo.
echo Docker Hub: https://hub.docker.com/r/%DOCKER_USERNAME%/%IMAGE_NAME%
echo.
echo Build completed successfully!

pause