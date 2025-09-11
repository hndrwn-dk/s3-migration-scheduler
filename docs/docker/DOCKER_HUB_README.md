# S3 Migration Scheduler

**🎉 Production-Ready S3 Migration Tool** - An enterprise-grade fullstack application for S3 bucket migrations with persistent SQLite database, scheduled migration support, real-time monitoring, and detailed reconciliation tracking.

![S3 Bucket Migration UI](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-1.1.1-blue)
![Database](https://img.shields.io/badge/Database-SQLite-blue)
![Scheduling](https://img.shields.io/badge/Scheduling-node--cron-purple)
![Docker](https://img.shields.io/badge/Docker-Hub%20Ready-blue)

## ✨ **Key Features**
- **🗂️ Persistent SQLite Database** - Reliable migration tracking and history
- **⏰ Scheduled Migrations** - Powered by node-cron for automated transfers
- **📊 Real-time Monitoring** - WebSocket & SSE for live progress updates
- **🔍 Reconciliation Analysis** - Detailed difference analysis and reporting
- **🌐 Multi-cloud Support** - AWS S3, GCP, Azure, MinIO, Wasabi, and more
- **🎨 Modern Dashboard** - React + TypeScript with intuitive interface

## ☕ Support Me

If you find this project helpful, you can support me here:

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-yellow?style=for-the-badge&logo=buymeacoffee&logoColor=white)](https://buymeacoffee.com/hendrawan)

## 🚀 **Quick Start**

### Option 1: Docker Hub (Recommended)
```bash
# Pull and run from Docker Hub
docker run -d \
  --name s3-migration-scheduler \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -v s3-migration-data:/app/data \
  -v s3-migration-logs:/app/logs \
  hndrwn/s3-migration-scheduler:latest

# Access web interface
open http://localhost:5000
```

### Option 2: Docker Compose
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Start with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop when done
docker-compose down
```

## 🔧 **Management Commands**

### Container Management
```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# View real-time logs
docker-compose logs -f

# View logs with timestamps
docker-compose logs -t
```

### Health and API Testing
```bash
# Check application health
curl http://localhost:5000/api/health

# Test API endpoints
curl http://localhost:5000/api/migration

# Check container health status
docker-compose ps
```

## 📋 **Configuration**

### Docker Compose Configuration
```yaml
services:
  s3-migration-scheduler:
    image: hndrwn/s3-migration-scheduler:latest
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

### Environment Variables
```bash
# Core Configuration
NODE_ENV=production              # Required for frontend serving
PORT=5000                       # Application port
FRONTEND_URL=http://localhost:5000  # Frontend URL

# Migration Settings
MAX_CONCURRENT_MIGRATIONS=5      # Maximum concurrent migrations
DEFAULT_CHUNK_SIZE=1000         # Default object chunk size

# Database Settings
DB_PATH=/app/data/migrations.db  # SQLite database path
```

## 📁 **Volume Mounts**

### Essential Volumes
```bash
# Data persistence
-v ./data:/app/data              # Migration database and user data
-v ./logs:/app/logs              # Application and migration logs
```

### Docker Named Volumes (Alternative)
```bash
# Using named volumes
-v s3-migration-data:/app/data   # Migration database and user data
-v s3-migration-logs:/app/logs   # Application and migration logs
```

## 🌐 **Access Points**

After starting the container:

- **Web Interface**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health
- **API Endpoints**: http://localhost:5000/api/migration

## 🎯 **System Requirements**

### Minimum Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **RAM**: 2GB available
- **Disk**: 1GB free space
- **Network**: Internet access for S3 operations

### Recommended
- **RAM**: 4GB+ for large migrations
- **SSD**: For better database performance
- **Stable Network**: For reliable S3 transfers

## 🔍 **Troubleshooting**

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs

# Check if port 5000 is available
netstat -tlnp | grep 5000
```

**Frontend not loading:**
```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs -f
```

**API not responding:**
```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Check container logs
docker-compose logs
```

### Useful Commands

```bash
# View all containers
docker-compose ps

# View container logs
docker-compose logs <service_name>

# Execute commands in running container
docker-compose exec s3-migration-scheduler /bin/bash

# Monitor resource usage
docker stats

# Clean up unused resources
docker system prune
```

## 📚 **Additional Resources**

- **GitHub Repository**: [hndrwn-dk/s3-migration-scheduler](https://github.com/hndrwn-dk/s3-migration-scheduler)
- **Docker Hub**: [hndrwn/s3-migration-scheduler](https://hub.docker.com/r/hndrwn/s3-migration-scheduler)
- **Documentation**: [docs/docker/README.md](https://github.com/hndrwn-dk/s3-migration-scheduler/blob/main/docs/docker/README.md)

## 🆘 **Support**

If you encounter issues:

1. **Check container logs**: `docker-compose logs`
2. **Verify health endpoint**: `curl http://localhost:5000/api/health`
3. **Report issues**: [GitHub Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)

---

**Built with ❤️ for the S3 migration community**

*Latest Release: v1.1.1 with enhanced Docker deployment and documentation*