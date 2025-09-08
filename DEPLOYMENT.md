# S3 Migration Scheduler - Docker Deployment Guide

## Prerequisites

- Docker installed on your system
- Docker Hub account
- Git repository with your code

## Local Development & Testing

### 1. Build and Run with Docker Compose

```bash
# Build and start the application
docker-compose up --build

# Run in detached mode (background)
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### 2. Build and Run with Docker

```bash
# Build the image
docker build -t s3-migration-scheduler .

# Run the container
docker run -p 5000:5000 --name s3-migration-scheduler s3-migration-scheduler

# Run in detached mode
docker run -d -p 5000:5000 --name s3-migration-scheduler s3-migration-scheduler

# View logs
docker logs -f s3-migration-scheduler

# Stop and remove container
docker stop s3-migration-scheduler
docker rm s3-migration-scheduler
```

## Deploy to Docker Hub

### Step 1: Create Docker Hub Account
1. Go to [Docker Hub](https://hub.docker.com/)
2. Sign up for a free account
3. Verify your email address

### Step 2: Login to Docker Hub

```bash
# Login to Docker Hub
docker login

# Enter your Docker Hub username and password when prompted
```

### Step 3: Tag Your Image

```bash
# Replace 'yourusername' with your actual Docker Hub username
# Replace 's3-migration-scheduler' with your desired repository name

# Tag the image for Docker Hub
docker tag s3-migration-scheduler yourusername/s3-migration-scheduler:latest

# Optional: Tag with version number
docker tag s3-migration-scheduler yourusername/s3-migration-scheduler:v1.0.0
```

### Step 4: Push to Docker Hub

```bash
# Push the latest version
docker push yourusername/s3-migration-scheduler:latest

# Push the versioned tag
docker push yourusername/s3-migration-scheduler:v1.0.0
```

### Step 5: Create Repository on Docker Hub (if not auto-created)

1. Go to [Docker Hub](https://hub.docker.com/)
2. Click "Create Repository"
3. Repository name: `s3-migration-scheduler`
4. Description: "S3 Migration Scheduler - Automated S3 data migration tool"
5. Set visibility (Public/Private)
6. Click "Create"

## Using Your Published Image

### Pull and Run from Docker Hub

```bash
# Pull the image
docker pull yourusername/s3-migration-scheduler:latest

# Run the container
docker run -p 5000:5000 yourusername/s3-migration-scheduler:latest
```

### Using Docker Compose with Published Image

Create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  s3-migration-scheduler:
    image: yourusername/s3-migration-scheduler:latest
    container_name: s3-migration-scheduler
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
    networks:
      - s3-migration-network

networks:
  s3-migration-network:
    driver: bridge
```

Then run:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Automated Deployment with GitHub Actions

Create `.github/workflows/docker-deploy.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
      
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
        
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: yourusername/s3-migration-scheduler
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=semver,pattern={{major}}.{{minor}}
          type=raw,value=latest,enable={{is_default_branch}}
          
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

## Environment Variables

Create a `.env` file for production:

```env
NODE_ENV=production
PORT=5000
FRONTEND_URL=http://localhost:5000

# Add your specific environment variables here
# MINIO_ENDPOINT=your-minio-endpoint
# MINIO_ACCESS_KEY=your-access-key
# MINIO_SECRET_KEY=your-secret-key
```

## Health Check

The application includes a health check endpoint:
- URL: `http://localhost:5000/api/health`
- Returns: `{"status":"healthy","timestamp":"...","version":"1.0.0"}`

## Troubleshooting

### Common Issues:

1. **Port already in use:**
   ```bash
   # Check what's using port 5000
   lsof -i :5000
   
   # Use a different port
   docker run -p 8080:5000 yourusername/s3-migration-scheduler:latest
   ```

2. **Permission issues with volumes:**
   ```bash
   # Create data and logs directories with proper permissions
   mkdir -p data logs
   chmod 755 data logs
   ```

3. **Container won't start:**
   ```bash
   # Check container logs
   docker logs s3-migration-scheduler
   
   # Check if image exists
   docker images | grep s3-migration-scheduler
   ```

## Security Considerations

1. **Use specific tags instead of `latest`** in production
2. **Scan images for vulnerabilities:**
   ```bash
   docker scan yourusername/s3-migration-scheduler:latest
   ```
3. **Use secrets management** for sensitive environment variables
4. **Regularly update base images** for security patches

## Monitoring

### View Application Logs:
```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f s3-migration-scheduler
```

### Monitor Resource Usage:
```bash
# View container stats
docker stats s3-migration-scheduler
```

## Cleanup

### Remove unused images:
```bash
docker image prune -a
```

### Remove unused containers:
```bash
docker container prune
```

### Remove everything:
```bash
docker system prune -a
```