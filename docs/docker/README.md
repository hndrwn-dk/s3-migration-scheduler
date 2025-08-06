# S3 Migration Scheduler - Docker Deployment Guide

## 🐳 Quick Start with Docker

### Option 1: Docker Hub (Recommended)
```bash
# Pull and run from Docker Hub
docker run -d \
  --name s3-migration-scheduler \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  hndrwn/s3-migration-scheduler:latest

# Access web interface
open http://localhost:5000
```

### Option 2: Docker Compose (Production)
```bash
# Download docker-compose.yml
wget https://raw.githubusercontent.com/hndrwn-dk/s3-migration-scheduler/main/docs/docker/docker-compose.yml

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### Option 3: Build from Source
```bash
# Clone repository
git clone https://github.com/hndrwn-dk/s3-migration-scheduler.git
cd s3-migration-scheduler

# Build and run
docker-compose -f docs/docker/docker-compose.yml up --build -d
```

## 📋 Configuration Files

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
      - ./data:/app/data
      - ./logs:/app/logs
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
```

### Production Docker Compose
```yaml
version: '3.8'

services:
  s3-migration-scheduler:
    image: hndrwn/s3-migration-scheduler:latest
    container_name: s3-migration-scheduler
    ports:
      - "5000:5000"
    volumes:
      - s3_migration_data:/app/data
      - s3_migration_logs:/app/logs
      - ./config:/app/config:ro
    environment:
      - NODE_ENV=production
      - PORT=5000
      - MAX_CONCURRENT_MIGRATIONS=5
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 1G
          cpus: '1.0'

  # Optional: Reverse proxy with SSL
  nginx:
    image: nginx:alpine
    container_name: s3-migration-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
    depends_on:
      - s3-migration-scheduler
    restart: unless-stopped

volumes:
  s3_migration_data:
    driver: local
  s3_migration_logs:
    driver: local
```

## 🔧 Environment Variables

### Core Configuration
```bash
# Application settings
NODE_ENV=production              # Environment mode
PORT=5000                       # Application port
LOG_LEVEL=info                  # Logging level (debug, info, warn, error)

# Migration settings
MAX_CONCURRENT_MIGRATIONS=5      # Maximum concurrent migrations
MAX_CONCURRENT_RECONCILIATIONS=3 # Maximum concurrent reconciliations
DEFAULT_CHUNK_SIZE=1000         # Default object chunk size

# Database settings
DB_PATH=/app/data/migrations.db  # SQLite database path
DB_BACKUP_INTERVAL=3600         # Database backup interval (seconds)

# Security settings
ENABLE_CORS=true                # Enable CORS
ALLOWED_ORIGINS=*               # Allowed CORS origins
API_RATE_LIMIT=1000             # API rate limit per hour

# MinIO client settings
MC_PATH=/usr/local/bin/mc       # MinIO client path
MC_CONFIG_DIR=/app/.mc          # MinIO client config directory
```

### Advanced Configuration
```bash
# Performance tuning
WORKER_THREADS=4                # Number of worker threads
MEMORY_LIMIT=2048               # Memory limit in MB
CACHE_SIZE=100                  # Cache size in MB

# Monitoring
ENABLE_METRICS=true             # Enable Prometheus metrics
METRICS_PORT=9090               # Metrics server port
HEALTH_CHECK_INTERVAL=30        # Health check interval (seconds)

# Backup and recovery
AUTO_BACKUP=true                # Enable automatic backups
BACKUP_RETENTION_DAYS=30        # Backup retention period
BACKUP_LOCATION=/app/backups    # Backup storage location
```

## 📁 Volume Mounts

### Essential Volumes
```bash
# Data persistence
-v $(pwd)/data:/app/data         # Migration database and user data
-v $(pwd)/logs:/app/logs         # Application and migration logs

# Configuration
-v $(pwd)/config:/app/config:ro  # Custom configuration files

# MinIO client config
-v $(pwd)/.mc:/app/.mc           # MinIO client profiles and settings
```

### Optional Volumes
```bash
# Backup storage
-v $(pwd)/backups:/app/backups   # Database backups

# SSL certificates
-v $(pwd)/ssl:/app/ssl:ro        # SSL certificates for HTTPS

# Custom themes/assets
-v $(pwd)/assets:/app/assets     # Custom UI assets
```

## 🚀 Deployment Scenarios

### Development Environment
```bash
# Quick development setup
docker run -it --rm \
  --name s3-migration-dev \
  -p 5000:5000 \
  -v $(pwd):/app/workspace \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  hndrwn/s3-migration-scheduler:latest
```

### Single Server Production
```bash
# Production deployment with data persistence
docker run -d \
  --name s3-migration-prod \
  -p 5000:5000 \
  --restart=unless-stopped \
  -v s3_migration_data:/app/data \
  -v s3_migration_logs:/app/logs \
  -e NODE_ENV=production \
  -e MAX_CONCURRENT_MIGRATIONS=10 \
  --memory=2g \
  --cpus=2 \
  hndrwn/s3-migration-scheduler:latest
```

### High Availability Setup
```yaml
# docker-compose.ha.yml
version: '3.8'

services:
  s3-migration-1:
    image: hndrwn/s3-migration-scheduler:latest
    environment:
      - INSTANCE_ID=node-1
      - CLUSTER_MODE=true
    volumes:
      - shared_data:/app/data
    
  s3-migration-2:
    image: hndrwn/s3-migration-scheduler:latest
    environment:
      - INSTANCE_ID=node-2
      - CLUSTER_MODE=true
    volumes:
      - shared_data:/app/data

  load-balancer:
    image: haproxy:alpine
    ports:
      - "5000:5000"
    volumes:
      - ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro

volumes:
  shared_data:
    driver: nfs  # Or other shared storage
```

## 🔒 Security Considerations

### Network Security
```bash
# Create custom network
docker network create s3-migration-net

# Run with custom network
docker run -d \
  --name s3-migration-scheduler \
  --network s3-migration-net \
  -p 127.0.0.1:5000:5000 \  # Bind to localhost only
  hndrwn/s3-migration-scheduler:latest
```

### User and Permissions
```dockerfile
# Custom Dockerfile with security hardening
FROM hndrwn/s3-migration-scheduler:latest

# Create non-root user
RUN addgroup -g 1001 s3user && \
    adduser -D -u 1001 -G s3user s3user

# Change ownership
RUN chown -R s3user:s3user /app

# Switch to non-root user
USER s3user

# Run application
CMD ["npm", "start"]
```

### Secrets Management
```bash
# Using Docker secrets
echo "my-secret-key" | docker secret create s3_access_key -

# Mount secrets
docker service create \
  --name s3-migration-scheduler \
  --secret s3_access_key \
  --publish 5000:5000 \
  hndrwn/s3-migration-scheduler:latest
```

## 📊 Monitoring and Logging

### Health Checks
```bash
# Check container health
docker health check s3-migration-scheduler

# View health check logs
docker inspect s3-migration-scheduler | grep -A 10 Health
```

### Log Management
```bash
# View logs
docker logs s3-migration-scheduler -f

# Log rotation
docker run -d \
  --log-driver=json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  hndrwn/s3-migration-scheduler:latest
```

### Metrics Collection
```yaml
# Prometheus monitoring
version: '3.8'

services:
  s3-migration-scheduler:
    image: hndrwn/s3-migration-scheduler:latest
    environment:
      - ENABLE_METRICS=true
      - METRICS_PORT=9090
    ports:
      - "5000:5000"
      - "9090:9090"

  prometheus:
    image: prom/prometheus
    ports:
      - "9091:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana-storage:/var/lib/grafana
```

## 🔄 Updates and Maintenance

### Container Updates
```bash
# Pull latest version
docker pull hndrwn/s3-migration-scheduler:latest

# Stop current container
docker stop s3-migration-scheduler

# Remove old container
docker rm s3-migration-scheduler

# Start new container with same configuration
docker run -d \
  --name s3-migration-scheduler \
  -p 5000:5000 \
  -v s3_migration_data:/app/data \
  hndrwn/s3-migration-scheduler:latest
```

### Database Backup
```bash
# Backup database
docker exec s3-migration-scheduler \
  cp /app/data/migrations.db /app/backups/migrations-$(date +%Y%m%d).db

# Restore database
docker exec s3-migration-scheduler \
  cp /app/backups/migrations-20241206.db /app/data/migrations.db
```

### Rolling Updates with Compose
```bash
# Update with zero downtime
docker-compose pull
docker-compose up -d --no-deps s3-migration-scheduler
```

## 🛠️ Troubleshooting

### Common Issues
```bash
# Container won't start
docker logs s3-migration-scheduler

# Port conflicts
docker ps -a | grep 5000
netstat -tlnp | grep 5000

# Permission issues
docker exec -it s3-migration-scheduler ls -la /app/data

# Database corruption
docker exec s3-migration-scheduler sqlite3 /app/data/migrations.db ".schema"
```

### Debug Mode
```bash
# Run in debug mode
docker run -it --rm \
  -p 5000:5000 \
  -e LOG_LEVEL=debug \
  -e NODE_ENV=development \
  hndrwn/s3-migration-scheduler:latest
```

## 📚 Additional Resources

- **[Docker Deployment Guide](DOCKER_DEPLOYMENT.md)** - Detailed deployment instructions
- **[Production Configuration](docker-compose.prod.yml)** - Production-ready compose file
- **[Development Setup](docker-compose.yml)** - Development environment

---

**Need help?** Check our [troubleshooting guide](../development/) or open an issue on [GitHub](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)!