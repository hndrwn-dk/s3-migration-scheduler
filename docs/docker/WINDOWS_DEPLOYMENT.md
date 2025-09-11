# Docker Deployment Guide for Windows 11

This guide will help you test your S3 Migration Scheduler Docker setup locally on Windows 11 and push it to Docker Hub.

## Prerequisites

- Windows 11 with Docker Desktop installed and running
- Git (for version control)
- Docker Hub account (for pushing images)
- PowerShell or Command Prompt

## Step 1: Resolve Git Conflicts (if any)

If you have unmerged files from your git pull, resolve them first:

```powershell
# Check git status
git status

# If there are conflicts, resolve them:
# For binary files like images, choose one version:
git checkout --ours docs/images/architecture.png
# OR
git checkout --theirs docs/images/architecture.png

# Add resolved files
git add docs/images/architecture.png

# Complete the merge
git commit -m "Resolve merge conflict in architecture.png"
```

## Step 2: Test Docker Setup Locally

### 2.1 Build the Docker Image

```powershell
# Navigate to your project directory
cd C:\Users\hendr\Deployment\s3-migration-scheduler

# Build the Docker image
docker build -t s3-migration-scheduler:local .

# Verify the image was created
docker images | findstr s3-migration-scheduler
```

### 2.2 Test with Docker Compose (Recommended)

```powershell
# Start the application with docker-compose
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f

# Test the application
# Open browser to: http://localhost:5000
```

**Note**: Docker Compose is the recommended method as it properly handles volume mounting and environment variables.

### 2.3 Test Individual Container

```powershell
# Run the container directly
docker run -d `
  --name s3-migration-scheduler-test `
  -p 5000:5000 `
  -v ${PWD}/data:/app/data `
  -v ${PWD}/logs:/app/logs `
  s3-migration-scheduler:local

# Check container status
docker ps

# View logs
docker logs s3-migration-scheduler-test

# Test health endpoint
curl http://localhost:5000/api/health
```

### 2.4 Clean Up Test Containers

```powershell
# Stop and remove test containers
docker-compose down
docker stop s3-migration-scheduler-test
docker rm s3-migration-scheduler-test
```

## Step 3: Push to Docker Hub

### 3.1 Login to Docker Hub

```powershell
# Login to Docker Hub
docker login

# Enter your Docker Hub username and password
```

### 3.2 Tag Your Image

```powershell
# Tag the image for Docker Hub (replace 'yourusername' with your Docker Hub username)
docker tag s3-migration-scheduler:local yourusername/s3-migration-scheduler:1.1.0
docker tag s3-migration-scheduler:local yourusername/s3-migration-scheduler:latest
```

### 3.3 Push to Docker Hub

```powershell
# Push both tags
docker push yourusername/s3-migration-scheduler:1.1.0
docker push yourusername/s3-migration-scheduler:latest
```

## Step 4: Test from Docker Hub

### 4.1 Pull and Test from Hub

```powershell
# Remove local image to test pulling from Hub
docker rmi yourusername/s3-migration-scheduler:latest

# Pull from Docker Hub
docker pull yourusername/s3-migration-scheduler:latest

# Test the pulled image
docker run -d `
  --name s3-migration-scheduler-hub-test `
  -p 5000:5000 `
  -v ${PWD}/data:/app/data `
  -v ${PWD}/logs:/app/logs `
  yourusername/s3-migration-scheduler:latest

# Test the application
# Open browser to: http://localhost:5000
```

## Step 5: Production Deployment

### 5.1 Using Docker Compose (Recommended)

Create a production `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  s3-migration-scheduler:
    image: yourusername/s3-migration-scheduler:1.1.0
    container_name: s3-migration-scheduler-prod
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - PORT=5000
      - FRONTEND_URL=http://localhost:5000
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - s3-migration-network

networks:
  s3-migration-network:
    driver: bridge

volumes:
  data:
  logs:
```

Deploy with:

```powershell
# Deploy production version
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 5.2 Using Docker Run

```powershell
# Production deployment with Docker run
docker run -d `
  --name s3-migration-scheduler-prod `
  --restart unless-stopped `
  -p 5000:5000 `
  -v C:\Users\hendr\Deployment\s3-migration-scheduler\data:/app/data `
  -v C:\Users\hendr\Deployment\s3-migration-scheduler\logs:/app/logs `
  -e NODE_ENV=production `
  -e PORT=5000 `
  -e FRONTEND_URL=http://localhost:5000 `
  yourusername/s3-migration-scheduler:1.1.0
```

## Automated Testing Scripts

We've created automated scripts to test and deploy your Docker setup. Choose the one that works best for your environment:

### Option 1: PowerShell Script (Recommended for Windows 11)
```powershell
# Run the PowerShell script with default settings
.\docs\docker\scripts\docker-test-and-deploy.ps1

# Or with custom parameters
.\docs\docker\scripts\docker-test-and-deploy.ps1 -DockerHubUsername "yourusername" -Version "1.1.0"

# Skip tests and only build/push
.\docs\docker\scripts\docker-test-and-deploy.ps1 -SkipTests

# Build and test but don't push to Docker Hub
.\docs\docker\scripts\docker-test-and-deploy.ps1 -SkipPush
```

### Option 2: Batch Script (Legacy Windows support)
```cmd
# Run the batch script
.\docs\docker\scripts\docker-test-and-deploy.bat
```

Both scripts will:
1. Check Docker status
2. Build the image
3. Test with docker-compose
4. Test individual container
5. Tag images for Docker Hub
6. Push to Docker Hub
7. Optionally test the pushed image

The PowerShell script offers better error handling and Windows 11 integration.

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```powershell
   # Check what's using port 5000
   netstat -ano | findstr :5000
   
   # Kill the process or use a different port
   docker run -p 8080:5000 yourusername/s3-migration-scheduler:latest
   ```

2. **Permission Issues with Volumes**
   ```powershell
   # Create data and logs directories with proper permissions
   mkdir data logs
   ```

3. **Docker Build Fails**
   ```powershell
   # Clean Docker cache
   docker system prune -a
   
   # Rebuild without cache
   docker build --no-cache -t s3-migration-scheduler:local .
   ```

4. **Health Check Fails**
   ```powershell
   # Check container logs
   docker logs s3-migration-scheduler-test
   
   # Test health endpoint manually
   curl http://localhost:5000/api/health
   ```

5. **Docker Desktop Not Running**
   ```powershell
   # Start Docker Desktop from Start Menu or:
   Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
   ```

### Useful Commands

```powershell
# View all containers
docker ps -a

# View all images
docker images

# View container logs
docker logs <container_name>

# Execute commands in running container
docker exec -it <container_name> /bin/bash

# Monitor resource usage
docker stats

# Clean up unused resources
docker system prune

# Check Docker Desktop status
docker version
```

## Security Considerations

1. **Use specific image tags** instead of `latest` in production
2. **Scan images** for vulnerabilities before deployment
3. **Use secrets management** for sensitive data
4. **Enable Docker Content Trust** for image verification
5. **Regularly update** base images and dependencies

## Monitoring

### Health Checks

The application includes built-in health checks:

```powershell
# Check container health
docker inspect <container_name> | findstr Health

# Test health endpoint
curl http://localhost:5000/api/health
```

### Logs

```powershell
# View real-time logs
docker logs -f <container_name>

# View logs with timestamps
docker logs -t <container_name>
```

## Next Steps

1. Set up automated builds on Docker Hub
2. Configure CI/CD pipeline for automated testing
3. Set up monitoring and alerting
4. Create backup strategies for data volumes
5. Document your deployment process

---

**Note**: Replace `yourusername` with your actual Docker Hub username throughout this guide.

For the main Docker documentation, see [README.md](README.md).