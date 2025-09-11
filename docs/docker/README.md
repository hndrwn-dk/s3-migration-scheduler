# S3 Migration Scheduler - Docker Deployment

## 🚀 Quick Start with Docker Compose

### Start the Application
```bash
# Start the application
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs
docker-compose logs -f
```

### Access the Application
- **Web Interface**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health

## 🔧 Management Commands

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

## 📁 Volume Mounts

The application uses the following volume mounts for data persistence:

```yaml
volumes:
  - ./data:/app/data    # Migration database and user data
  - ./logs:/app/logs    # Application and migration logs
```

## 🌐 Access Points

After starting with `docker-compose up -d`:

- **Web Interface**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health
- **API Endpoints**: http://localhost:5000/api/migration

## 🎯 System Requirements

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

## 🔍 Troubleshooting

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

## 📚 Additional Resources

- **[Main Documentation](../../README.md)** - Complete project overview
- **[Windows Installation](../windows/README.md)** - Desktop application
- **[Linux Installation](../linux/README.md)** - Native Linux packages

## 🆘 Support

If you encounter issues:

1. **Check container logs**: `docker-compose logs`
2. **Verify health endpoint**: `curl http://localhost:5000/api/health`
3. **Report issues**: [GitHub Issues](https://github.com/hndrwn-dk/s3-migration-scheduler/issues)

---

**Need help?** Open an issue on [GitHub](https://github.com/hndrwn-dk/s3-migration-scheduler/issues) with your Docker logs and error details!