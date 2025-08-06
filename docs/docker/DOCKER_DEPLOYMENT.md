# 🐳 Docker Deployment Guide

This guide provides comprehensive instructions for deploying the S3 Migration Scheduler using Docker containers. This Docker-based approach is perfect for migration scenarios, allowing easy deployment across different environments.

## 📦 Available Docker Images

When published to Docker Hub, the following images will be available:

- `your-username/s3-migration-scheduler-backend:latest` - Backend API server
- `your-username/s3-migration-scheduler-frontend:latest` - Frontend React application with nginx
- `your-username/s3-migration-scheduler:latest` - All-in-one container with both frontend and backend

## 🚀 Quick Start Options

### Option 1: All-in-One Container (Recommended for Migration)

Perfect for quick migration scenarios where you need everything in a single container:

```bash
# Pull and run the all-in-one container
docker run -d \
  --name s3-migration \
  -p 80:80 \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  your-username/s3-migration-scheduler:latest

# Access the application at http://localhost
```

### Option 2: Separate Frontend and Backend (Production)

For production deployments with separate scaling:

```bash
# Start backend
docker run -d \
  --name s3-migration-backend \
  -p 5000:5000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  your-username/s3-migration-scheduler-backend:latest

# Start frontend
docker run -d \
  --name s3-migration-frontend \
  -p 80:80 \
  --link s3-migration-backend:backend \
  your-username/s3-migration-scheduler-frontend:latest
```

### Option 3: Docker Compose (Best for Development)

Use the provided docker-compose files for easy management:

```bash
# For development
docker-compose up -d

# For production
docker-compose -f docker-compose.prod.yml up -d
```

## 🛠️ Deployment Scripts

### Quick Deployment Script

Use the provided deployment script for automated setup:

```bash
# Deploy in production mode
./scripts/docker-deploy.sh deploy

# Deploy in development mode
DEPLOYMENT_MODE=development ./scripts/docker-deploy.sh deploy

# Deploy all-in-one container
DEPLOYMENT_MODE=allinone ./scripts/docker-deploy.sh deploy

# Migrate from existing local installation
./scripts/docker-deploy.sh migrate
```

### Build and Publish Script

To build and publish your own images:

```bash
# Set your Docker Hub username
export DOCKER_HUB_USERNAME=your-username

# Build and push images
./scripts/docker-build.sh

# Build specific version
VERSION=v1.2.0 ./scripts/docker-build.sh
```

## 📁 Volume Management

### Data Persistence

The application uses several volumes for data persistence:

```bash
# Essential volumes
-v $(pwd)/data:/app/data          # SQLite database and migration data
-v $(pwd)/logs:/app/logs          # Application logs
-v $(pwd)/config:/app/config      # Configuration files (optional)
```

### Volume Structure

```
./data/
├── migrations.db                 # SQLite database
├── temp/                         # Temporary migration files
└── exports/                      # Migration reports and exports

./logs/
├── app.log                       # Application logs
├── migration.log                 # Migration-specific logs
└── error.log                     # Error logs

./config/
└── app.env                       # Environment configuration
```

## 🔧 Environment Configuration

### Environment Variables

Create a `config/app.env` file for configuration:

```env
# Production configuration
NODE_ENV=production
LOG_LEVEL=info
MAX_CONCURRENT_MIGRATIONS=5
DB_PATH=/app/data/migrations.db

# Frontend configuration
REACT_APP_API_URL=/api
REACT_APP_WS_URL=/ws

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: CORS configuration
FRONTEND_URL=https://your-domain.com
```

### Docker Compose Environment

For docker-compose deployments, you can also use `.env` file:

```env
# Docker configuration
DOCKER_IMAGE_PREFIX=your-username/s3-migration-scheduler
VERSION=latest
DEPLOYMENT_MODE=production

# Directory configuration
DATA_DIR=./data
CONFIG_DIR=./config
```

## 🌐 Network Configuration

### Port Mapping

| Service | Internal Port | Default External Port | Purpose |
|---------|---------------|----------------------|---------|
| Frontend | 80 | 80 | Web interface |
| Backend API | 5000 | 5000 | REST API and WebSocket |
| All-in-one | 80, 5000 | 80, 5000 | Combined access |

### Reverse Proxy Setup

For production with SSL, use a reverse proxy:

```nginx
# nginx.conf
upstream s3_migration_backend {
    server localhost:5000;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://s3_migration_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://s3_migration_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
```

## 🔄 Migration Scenarios

### Scenario 1: Fresh Deployment

For new deployments:

```bash
# Clone the repository
git clone <your-repo-url>
cd s3-migration-scheduler

# Deploy using script
DOCKER_IMAGE_PREFIX=your-username/s3-migration-scheduler \
./scripts/docker-deploy.sh deploy
```

### Scenario 2: Migrating from Local Installation

If you have an existing local installation:

```bash
# Backup existing data
./scripts/docker-deploy.sh backup

# Migrate to Docker
./scripts/docker-deploy.sh migrate

# The script will automatically find and migrate:
# - ./server/data/* -> ./data/
# - .env -> ./config/app.env
# - Migration databases and logs
```

### Scenario 3: Updating Existing Docker Deployment

To update an existing Docker deployment:

```bash
# Backup current data
./scripts/docker-deploy.sh backup

# Pull latest images and restart
./scripts/docker-deploy.sh deploy

# Check status
./scripts/docker-deploy.sh status
```

### Scenario 4: Multi-Server Deployment

For deploying across multiple servers:

```bash
# Server 1: Backend only
docker run -d \
  --name s3-migration-backend \
  -p 5000:5000 \
  -v /shared/data:/app/data \
  your-username/s3-migration-scheduler-backend:latest

# Server 2: Frontend only
docker run -d \
  --name s3-migration-frontend \
  -p 80:80 \
  -e REACT_APP_API_URL=http://server1:5000 \
  your-username/s3-migration-scheduler-frontend:latest
```

## 📊 Monitoring and Maintenance

### Health Checks

Built-in health checks are available:

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost/

# Docker health status
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Logs Management

View application logs:

```bash
# Container logs
docker logs s3-migration-backend
docker logs s3-migration-frontend

# Application logs from volumes
tail -f logs/app.log
tail -f logs/migration.log
```

### Backup and Recovery

Regular backup procedures:

```bash
# Automated backup
./scripts/docker-deploy.sh backup

# Manual backup
docker exec s3-migration-backend \
  sqlite3 /app/data/migrations.db ".backup /app/data/backup.db"

# Copy data out of container
docker cp s3-migration-backend:/app/data ./backup-$(date +%Y%m%d)
```

## 🔒 Security Considerations

### Production Security

1. **Use non-root containers**: Images are built with non-root users
2. **Limit resources**: Use deploy.resources in docker-compose
3. **Network security**: Use internal networks for container communication
4. **Volume permissions**: Ensure proper file permissions on host volumes
5. **Environment variables**: Use Docker secrets for sensitive data

```yaml
# docker-compose security example
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
    networks:
      - internal
    secrets:
      - db_password
```

### SSL/TLS Configuration

For production deployments, always use SSL:

```bash
# Using Let's Encrypt with Docker
docker run -d \
  --name nginx-proxy \
  -p 80:80 -p 443:443 \
  -v /var/run/docker.sock:/tmp/docker.sock:ro \
  -v certs:/etc/nginx/certs \
  nginx-proxy/nginx-proxy

docker run -d \
  --name letsencrypt \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v certs:/etc/nginx/certs \
  nginx-proxy/acme-companion
```

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**:
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :80
   
   # Use different ports
   docker run -p 8080:80 ...
   ```

2. **Volume permission issues**:
   ```bash
   # Fix permissions
   sudo chown -R 1001:1001 ./data ./logs
   ```

3. **Network connectivity**:
   ```bash
   # Check container networking
   docker network ls
   docker inspect s3-migration-backend
   ```

4. **Database corruption**:
   ```bash
   # Restore from backup
   docker cp backup.db s3-migration-backend:/app/data/migrations.db
   docker restart s3-migration-backend
   ```

### Debug Mode

Enable debug logging:

```bash
# Debug mode deployment
docker run -d \
  -e NODE_ENV=development \
  -e LOG_LEVEL=debug \
  your-username/s3-migration-scheduler-backend:latest
```

## 📋 Checklist for Production Deployment

- [ ] Docker and Docker Compose installed
- [ ] Proper volume mounts configured
- [ ] Environment variables set
- [ ] Firewall ports opened (80, 5000)
- [ ] SSL certificates configured (if needed)
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting set up
- [ ] Security hardening applied
- [ ] Resource limits configured
- [ ] Network security implemented

## 🆘 Support and Community

If you encounter issues with the Docker deployment:

1. Check the [troubleshooting section](#-troubleshooting)
2. Review container logs: `docker logs <container-name>`
3. Check the main project README for additional documentation
4. Create an issue in the project repository

## 🎯 Next Steps

After successful deployment:

1. Access the web interface at `http://localhost` (or your domain)
2. Configure your S3 endpoints in the Configuration tab
3. Set up your first migration in the Migration tab
4. Monitor progress in the Dashboard
5. Schedule recurring migrations if needed

The Docker deployment makes it easy to scale, backup, and migrate your S3 operations across different environments!