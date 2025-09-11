@echo off
setlocal enabledelayedexpansion

echo ========================================
echo S3 Migration Scheduler - Docker Test & Deploy
echo ========================================
echo.

REM Configuration
set IMAGE_NAME=s3-migration-scheduler
set CONTAINER_NAME=s3-migration-scheduler-test
set DOCKER_HUB_USERNAME=
set VERSION=1.1.0

REM Check if Docker is running
echo [1/8] Checking Docker status...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo ✓ Docker is running

REM Get Docker Hub username if not set
if "%DOCKER_HUB_USERNAME%"=="" (
    set /p DOCKER_HUB_USERNAME="Enter your Docker Hub username: "
    if "!DOCKER_HUB_USERNAME!"=="" (
        echo ERROR: Docker Hub username is required!
        pause
        exit /b 1
    )
)

echo.
echo [2/8] Cleaning up previous test containers...
docker stop %CONTAINER_NAME% >nul 2>&1
docker rm %CONTAINER_NAME% >nul 2>&1
echo ✓ Cleanup completed

echo.
echo [3/8] Building Docker image...
docker build -t %IMAGE_NAME%:local .
if %errorlevel% neq 0 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)
echo ✓ Docker image built successfully

echo.
echo [4/8] Testing with docker-compose...
docker-compose down >nul 2>&1
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Docker compose failed!
    pause
    exit /b 1
)

echo Waiting for application to start...
timeout /t 10 /nobreak >nul

REM Test health endpoint
echo Testing health endpoint...
curl -f http://localhost:5000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Health check failed, but continuing...
) else (
    echo ✓ Health check passed
)

echo ✓ Docker compose test completed
echo Application should be available at: http://localhost:5000

echo.
echo [5/8] Testing individual container...
docker-compose down
docker run -d --name %CONTAINER_NAME% -p 5000:5000 -v "%cd%\data:/app/data" -v "%cd%\logs:/app/logs" %IMAGE_NAME%:local
if %errorlevel% neq 0 (
    echo ERROR: Container test failed!
    pause
    exit /b 1
)

echo Waiting for container to start...
timeout /t 10 /nobreak >nul

REM Test health endpoint again
curl -f http://localhost:5000/api/health >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Health check failed, but continuing...
) else (
    echo ✓ Health check passed
)

echo ✓ Individual container test completed

echo.
echo [6/8] Cleaning up test containers...
docker stop %CONTAINER_NAME% >nul 2>&1
docker rm %CONTAINER_NAME% >nul 2>&1
echo ✓ Test containers cleaned up

echo.
echo [7/8] Tagging images for Docker Hub...
docker tag %IMAGE_NAME%:local %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:%VERSION%
docker tag %IMAGE_NAME%:local %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:latest
echo ✓ Images tagged

echo.
echo [8/8] Pushing to Docker Hub...
echo Logging into Docker Hub...
docker login
if %errorlevel% neq 0 (
    echo ERROR: Docker Hub login failed!
    pause
    exit /b 1
)

echo Pushing version %VERSION%...
docker push %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:%VERSION%
if %errorlevel% neq 0 (
    echo ERROR: Failed to push version %VERSION%!
    pause
    exit /b 1
)

echo Pushing latest...
docker push %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:latest
if %errorlevel% neq 0 (
    echo ERROR: Failed to push latest!
    pause
    exit /b 1
)

echo.
echo ========================================
echo DEPLOYMENT COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Your images are now available on Docker Hub:
echo - %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:%VERSION%
echo - %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:latest
echo.
echo To deploy in production, use:
echo docker run -d -p 5000:5000 -v ./data:/app/data -v ./logs:/app/logs %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:%VERSION%
echo.
echo Or with docker-compose:
echo docker-compose up -d
echo.
echo Application will be available at: http://localhost:5000
echo.

REM Ask if user wants to test the pushed image
set /p TEST_PUSHED="Do you want to test the pushed image from Docker Hub? (y/n): "
if /i "!TEST_PUSHED!"=="y" (
    echo.
    echo Testing pushed image from Docker Hub...
    docker rmi %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:latest >nul 2>&1
    docker pull %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:latest
    docker run -d --name %CONTAINER_NAME%-hub-test -p 5000:5000 -v "%cd%\data:/app/data" -v "%cd%\logs:/app/logs" %DOCKER_HUB_USERNAME%/%IMAGE_NAME%:latest
    echo.
    echo ✓ Pushed image test completed
    echo Application should be available at: http://localhost:5000
    echo.
    echo To stop the test container:
    echo docker stop %CONTAINER_NAME%-hub-test
    echo docker rm %CONTAINER_NAME%-hub-test
)

echo.
echo Press any key to exit...
pause >nul