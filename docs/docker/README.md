# S3 Migration Scheduler - Docker Deployment

## 🚀 Quick Start

### Option 1: Docker Hub (Recommended)
```bash
# Pull and run from Docker Hub
docker run -d \
  --name s3-migration-scheduler \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -v s3-migration-data:/app/data \
  hndrwn/s3-migration-scheduler:latest

# Access web interface
open http://localhost:5000
```

### Option 2: Docker Compose
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler/docs/docker

# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop when done
docker-compose down
```

### Option 3: Build from Source
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Build the image
docker build -t s3-migration-scheduler .

# Run the container
docker run -d \
  --name s3-migration-scheduler \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -v s3-migration-data:/app/data \
  s3-migration-scheduler
```

## 📋 Configuration

### Basic Docker Compose
```yaml
version: '3.8'

services:
  s3-migration-scheduler:
    image: hndrwn/s3-migration-scheduler:latest
    container_name: s3-migration-scheduler
    ports:
      - "5000:5000"
    volumes:
      - s3-migration-data:/app/data
      - s3-migration-logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=5000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  s3-migration-data:
  s3-migration-logs:
```

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production              # Required for frontend serving
PORT=5000                       # Application port
LOG_LEVEL=info                  # Logging level

# Migration Settings
MAX_CONCURRENT_MIGRATIONS=5      # Maximum concurrent migrations
DEFAULT_CHUNK_SIZE=1000         # Default object chunk size

# Database Settings
DB_PATH=/app/data/migrations.db  # SQLite database path
```

## 📁 Volume Mounts

### Essential Volumes
```bash
# Data persistence
-v s3-migration-data:/app/data   # Migration database and user data
-v s3-migration-logs:/app/logs   # Application and migration logs
```

### Host Directory Mounts (Alternative)
```bash
# Mount to host directories
-v $(pwd)/data:/app/data         # Local data directory
-v $(pwd)/logs:/app/logs         # Local logs directory
```

## 🔧 Management Commands

### Container Management
```bash
# View logs
docker logs s3-migration-scheduler -f

# Check health
docker exec s3-migration-scheduler curl -f http://localhost:5000/api/health

# Access container shell
docker exec -it s3-migration-scheduler /bin/bash

# Stop and remove
docker stop s3-migration-scheduler
docker rm s3-migration-scheduler

# Update to latest version
docker pull hndrwn/s3-migration-scheduler:latest
docker stop s3-migration-scheduler
docker rm s3-migration-scheduler
# Run with new image (same command as above)
```

### Data Backup
```bash
# Backup database
docker cp s3-migration-scheduler:/app/data ./backup-data

# Restore database
docker cp ./backup-data s3-migration-scheduler:/app/data
```

## 🌐 Access Points

After starting the container:

- **Web Interface**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health
- **API Endpoints**: http://localhost:5000/api/migration

## 🎯 System Requirements

### Minimum Requirements
- **Docker**: 20.10+
- **RAM**: 2GB available
- **Disk**: 1GB free space
- **Network**: Internet access for S3 operations

### Recommended
- **RAM**: 4GB+ for large migrations
- **SSD**: For better database performance
- **Stable Network**: For reliable S3 transfers

## 🔍 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker logs s3-migration-scheduler

# Check if port 5000 is available
netstat -tlnp | grep 5000
```

**Frontend not loading:**
```bash
# Ensure NODE_ENV is set
docker exec s3-migration-scheduler printenv | grep NODE_ENV

# Should show: NODE_ENV=production
```

**Database issues:**
```bash
# Check database directory
docker exec s3-migration-scheduler ls -la /app/data

# Check database permissions
docker exec s3-migration-scheduler sqlite3 /app/data/migrations.db ".tables"
```

**API not responding:**
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Test migration endpoint
curl http://localhost:5000/api/migration
```

## 📚 Additional Resources

- **[Main Documentation](../../README.md)** - Complete project overview
- **[Windows 11 Docker Deployment](WINDOWS_DEPLOYMENT.md)** - Windows-specific Docker guide
- **[Windows Installation](../windows/README.md)** - Desktop application
- **[Linux Installation](../linux/README.md)** - Native Linux packages

## 🆘 Support

If you encounter issues:

1. **Check container logs**: `docker logs s3-migration-scheduler`
2. **Verify health endpoint**: `curl http://localhost:5000/api/health`
3. **Report issues**: [GitHub Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)

---

**Need help?** Open an issue on [GitHub](https://github.com/hndrwn-dk/s3-migration-scheduler/issues) with your Docker logs and error details!