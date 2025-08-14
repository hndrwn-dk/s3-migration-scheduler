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

echo 🚀 Building and pushing S3 Migration Scheduler v%VERSION% to Docker Hub
echo ═══════════════════════════════════════════════════════════════════════

REM Check if Docker is running
echo Step 1: Checking Docker...
docker info >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ Error: Docker is not running. Please start Docker and try again.
    exit /b 1
)

REM Check if logged into Docker Hub
echo Step 2: Checking Docker Hub login...
docker info | find "Username:" >nul
if !errorlevel! neq 0 (
    echo ❌ Error: Not logged into Docker Hub. Please run 'docker login' first.
    exit /b 1
)

REM Build React client
echo Step 3: Building React client...
cd client
if not exist "node_modules" (
    echo Installing client dependencies...
    npm install
)
npm run build
cd ..

REM Build Docker image
echo Step 4: Building Docker image...
docker build -t "%VERSION_TAG%" -t "%LATEST_TAG_FULL%" .
if !errorlevel! neq 0 (
    echo ❌ Failed to build Docker image
    exit /b 1
)
echo ✅ Docker image built successfully!

REM Push to Docker Hub
echo Step 5: Pushing to Docker Hub...
echo Pushing %VERSION_TAG%...
docker push "%VERSION_TAG%"
if !errorlevel! neq 0 (
    echo ❌ Failed to push version tag
    exit /b 1
)

echo Pushing %LATEST_TAG_FULL%...
docker push "%LATEST_TAG_FULL%"
if !errorlevel! neq 0 (
    echo ❌ Failed to push latest tag
    exit /b 1
)

echo ✅ Images pushed successfully to Docker Hub!

REM Show success information
echo.
echo 🎉 SUCCESS! Docker images published to Docker Hub
echo ═══════════════════════════════════════════════════════════════════════
echo 📦 Image: %FULL_IMAGE_NAME%
echo 🏷️  Tags: %VERSION%, %LATEST_TAG%
echo.
echo 🚀 Quick deployment commands:
echo    docker run -d -p 5000:5000 %VERSION_TAG%
echo    docker-compose up -d
echo.
echo 🌐 Docker Hub: https://hub.docker.com/r/%DOCKER_USERNAME%/%IMAGE_NAME%

pause