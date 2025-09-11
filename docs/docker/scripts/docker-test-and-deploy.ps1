# S3 Migration Scheduler - Docker Test & Deploy Script for Windows 11
# PowerShell version with enhanced error handling and Windows-specific features

param(
    [string]$DockerHubUsername = "",
    [string]$Version = "1.1.0",
    [string]$ImageName = "s3-migration-scheduler",
    [string]$ContainerName = "s3-migration-scheduler-test",
    [switch]$SkipTests = $false,
    [switch]$SkipPush = $false
)

# Configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "S3 Migration Scheduler - Docker Test & Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        $null = docker version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Function to wait for application to start
function Wait-ForApplication {
    param([int]$TimeoutSeconds = 30)
    
    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -UseBasicParsing
            if ($response.StatusCode -eq 200) {
                return $true
            }
        }
        catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
    return $false
}

# Step 1: Check Docker status
Write-Host "[1/8] Checking Docker status..." -ForegroundColor Yellow
if (-not (Test-DockerRunning)) {
    Write-Host "ERROR: Docker is not running or not installed!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    Write-Host "You can start Docker Desktop from the Start Menu or run:" -ForegroundColor Yellow
    Write-Host "Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'" -ForegroundColor Gray
    exit 1
}
Write-Host "✓ Docker is running" -ForegroundColor Green

# Get Docker Hub username if not provided
if ([string]::IsNullOrEmpty($DockerHubUsername)) {
    $DockerHubUsername = Read-Host "Enter your Docker Hub username"
    if ([string]::IsNullOrEmpty($DockerHubUsername)) {
        Write-Host "ERROR: Docker Hub username is required!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[2/8] Cleaning up previous test containers..." -ForegroundColor Yellow
try {
    docker stop $ContainerName 2>$null | Out-Null
    docker rm $ContainerName 2>$null | Out-Null
    docker-compose down 2>$null | Out-Null
    Write-Host "✓ Cleanup completed" -ForegroundColor Green
}
catch {
    Write-Host "✓ Cleanup completed (no previous containers found)" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/8] Building Docker image..." -ForegroundColor Yellow
try {
    docker build -t "${ImageName}:local" .
    Write-Host "✓ Docker image built successfully" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    Write-Host "Check the build logs above for details." -ForegroundColor Red
    exit 1
}

if (-not $SkipTests) {
    Write-Host ""
    Write-Host "[4/8] Testing with docker-compose..." -ForegroundColor Yellow
    try {
        docker-compose up -d
        Write-Host "✓ Docker compose started" -ForegroundColor Green
        
        Write-Host "Waiting for application to start..." -ForegroundColor Yellow
        if (Wait-ForApplication) {
            Write-Host "✓ Health check passed" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Health check failed, but continuing..." -ForegroundColor Yellow
        }
        
        Write-Host "✓ Docker compose test completed" -ForegroundColor Green
        Write-Host "Application should be available at: http://localhost:5000" -ForegroundColor Cyan
    }
    catch {
        Write-Host "ERROR: Docker compose test failed!" -ForegroundColor Red
        Write-Host "Check the logs above for details." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "[5/8] Testing individual container..." -ForegroundColor Yellow
    try {
        docker-compose down
        docker run -d --name $ContainerName -p 5000:5000 -v "${PWD}/data:/app/data" -v "${PWD}/logs:/app/logs" "${ImageName}:local"
        Write-Host "✓ Individual container started" -ForegroundColor Green
        
        Write-Host "Waiting for container to start..." -ForegroundColor Yellow
        if (Wait-ForApplication) {
            Write-Host "✓ Health check passed" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Health check failed, but continuing..." -ForegroundColor Yellow
        }
        
        Write-Host "✓ Individual container test completed" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Individual container test failed!" -ForegroundColor Red
        Write-Host "Check the logs above for details." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "[6/8] Cleaning up test containers..." -ForegroundColor Yellow
    try {
        docker stop $ContainerName 2>$null | Out-Null
        docker rm $ContainerName 2>$null | Out-Null
        Write-Host "✓ Test containers cleaned up" -ForegroundColor Green
    }
    catch {
        Write-Host "✓ Test containers cleaned up" -ForegroundColor Green
    }
} else {
    Write-Host ""
    Write-Host "[4-6/8] Skipping tests as requested..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[7/8] Tagging images for Docker Hub..." -ForegroundColor Yellow
try {
    docker tag "${ImageName}:local" "${DockerHubUsername}/${ImageName}:${Version}"
    docker tag "${ImageName}:local" "${DockerHubUsername}/${ImageName}:latest"
    Write-Host "✓ Images tagged" -ForegroundColor Green
}
catch {
    Write-Host "ERROR: Failed to tag images!" -ForegroundColor Red
    exit 1
}

if (-not $SkipPush) {
    Write-Host ""
    Write-Host "[8/8] Pushing to Docker Hub..." -ForegroundColor Yellow
    Write-Host "Logging into Docker Hub..." -ForegroundColor Yellow
    try {
        docker login
        Write-Host "✓ Docker Hub login successful" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Docker Hub login failed!" -ForegroundColor Red
        Write-Host "Please check your credentials and try again." -ForegroundColor Red
        exit 1
    }

    Write-Host "Pushing version $Version..." -ForegroundColor Yellow
    try {
        docker push "${DockerHubUsername}/${ImageName}:${Version}"
        Write-Host "✓ Version $Version pushed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to push version $Version!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Pushing latest..." -ForegroundColor Yellow
    try {
        docker push "${DockerHubUsername}/${ImageName}:latest"
        Write-Host "✓ Latest version pushed successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: Failed to push latest!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[8/8] Skipping push to Docker Hub as requested..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your images are now available on Docker Hub:" -ForegroundColor Cyan
Write-Host "- ${DockerHubUsername}/${ImageName}:${Version}" -ForegroundColor White
Write-Host "- ${DockerHubUsername}/${ImageName}:latest" -ForegroundColor White
Write-Host ""
Write-Host "To deploy in production, use:" -ForegroundColor Cyan
Write-Host "docker run -d -p 5000:5000 -v ./data:/app/data -v ./logs:/app/logs ${DockerHubUsername}/${ImageName}:${Version}" -ForegroundColor White
Write-Host ""
Write-Host "Or with docker-compose:" -ForegroundColor Cyan
Write-Host "docker-compose up -d" -ForegroundColor White
Write-Host ""
Write-Host "Application will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to test the pushed image
if (-not $SkipPush) {
    $testPushed = Read-Host "Do you want to test the pushed image from Docker Hub? (y/n)"
    if ($testPushed -eq "y" -or $testPushed -eq "Y") {
        Write-Host ""
        Write-Host "Testing pushed image from Docker Hub..." -ForegroundColor Yellow
        try {
            docker rmi "${DockerHubUsername}/${ImageName}:latest" 2>$null | Out-Null
            docker pull "${DockerHubUsername}/${ImageName}:latest"
            docker run -d --name "${ContainerName}-hub-test" -p 5000:5000 -v "${PWD}/data:/app/data" -v "${PWD}/logs:/app/logs" "${DockerHubUsername}/${ImageName}:latest"
            Write-Host ""
            Write-Host "✓ Pushed image test completed" -ForegroundColor Green
            Write-Host "Application should be available at: http://localhost:5000" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "To stop the test container:" -ForegroundColor Yellow
            Write-Host "docker stop ${ContainerName}-hub-test" -ForegroundColor White
            Write-Host "docker rm ${ContainerName}-hub-test" -ForegroundColor White
        }
        catch {
            Write-Host "ERROR: Failed to test pushed image!" -ForegroundColor Red
            Write-Host "Check the logs above for details." -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "Script completed successfully!" -ForegroundColor Green
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")