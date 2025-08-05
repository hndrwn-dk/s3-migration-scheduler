#!/bin/bash

# S3 Migration Scheduler - Docker Deployment Script
# Quick deployment script for migration scenarios

set -e

# Configuration
DEFAULT_IMAGE_PREFIX="your-username/s3-migration-scheduler"
IMAGE_PREFIX="${DOCKER_IMAGE_PREFIX:-$DEFAULT_IMAGE_PREFIX}"
VERSION="${VERSION:-latest}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-production}"
DATA_DIR="${DATA_DIR:-./data}"
CONFIG_DIR="${CONFIG_DIR:-./config}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if docker is available
check_requirements() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
}

# Create necessary directories
setup_directories() {
    log_step "Setting up directories..."
    
    mkdir -p "${DATA_DIR}"
    mkdir -p "${CONFIG_DIR}"
    mkdir -p ./logs
    
    # Create sample configuration if it doesn't exist
    if [ ! -f "${CONFIG_DIR}/app.env" ]; then
        cat > "${CONFIG_DIR}/app.env" << 'EOF'
# S3 Migration Scheduler Configuration
NODE_ENV=production
LOG_LEVEL=info
MAX_CONCURRENT_MIGRATIONS=5
DB_PATH=/app/data/migrations.db

# Frontend Configuration
REACT_APP_API_URL=/api
REACT_APP_WS_URL=/ws

# Optional: Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: CORS configuration
# FRONTEND_URL=https://your-domain.com
EOF
        log_info "Created sample configuration at ${CONFIG_DIR}/app.env"
        log_warn "Please review and update the configuration file before deploying"
    fi
}

# Generate docker-compose override for different deployment modes
generate_compose_override() {
    local mode=$1
    
    case $mode in
        "development")
            cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  backend:
    image: ${IMAGE_PREFIX}-backend:${VERSION}
    environment:
      - NODE_ENV=development
    volumes:
      - ${DATA_DIR}:/app/data
      - ./logs:/app/logs
      - ${CONFIG_DIR}/app.env:/app/.env
    ports:
      - "5000:5000"

  frontend:
    image: ${IMAGE_PREFIX}-frontend:${VERSION}
    ports:
      - "3000:80"
    depends_on:
      - backend
EOF
            ;;
        "production")
            cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  backend:
    image: ${IMAGE_PREFIX}-backend:${VERSION}
    environment:
      - NODE_ENV=production
    volumes:
      - ${DATA_DIR}:/app/data
      - ./logs:/app/logs
      - ${CONFIG_DIR}/app.env:/app/.env
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'

  frontend:
    image: ${IMAGE_PREFIX}-frontend:${VERSION}
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
EOF
            ;;
        "allinone")
            cat > docker-compose.override.yml << EOF
version: '3.8'

services:
  s3-migration:
    image: ${IMAGE_PREFIX}:${VERSION}
    ports:
      - "80:80"
      - "5000:5000"
    volumes:
      - ${DATA_DIR}:/app/data
      - ./logs:/app/logs
      - ${CONFIG_DIR}/app.env:/app/.env
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 1.5G
          cpus: '1.5'
EOF
            ;;
    esac
}

# Deploy the application
deploy() {
    local mode=$1
    
    log_step "Deploying S3 Migration Scheduler in ${mode} mode..."
    
    # Generate compose override
    generate_compose_override "$mode"
    
    # Pull latest images
    log_info "Pulling latest Docker images..."
    if [ "$mode" = "allinone" ]; then
        docker pull "${IMAGE_PREFIX}:${VERSION}"
    else
        docker pull "${IMAGE_PREFIX}-backend:${VERSION}"
        docker pull "${IMAGE_PREFIX}-frontend:${VERSION}"
    fi
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null || true
    
    # Start services
    log_info "Starting services..."
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        docker compose up -d
    fi
    
    # Wait for services to be healthy
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check service health
    if [ "$mode" = "allinone" ]; then
        check_service_health "http://localhost:80" "S3 Migration Scheduler"
    else
        check_service_health "http://localhost:5000/api/health" "Backend API"
        check_service_health "http://localhost:80" "Frontend" || check_service_health "http://localhost:3000" "Frontend"
    fi
}

# Check if service is healthy
check_service_health() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    log_info "Checking health of ${service_name}..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_info "${service_name} is healthy!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_warn "${service_name} health check failed after ${max_attempts} attempts"
    return 1
}

# Show deployment status
show_status() {
    log_step "Deployment Status:"
    echo ""
    
    if command -v docker-compose &> /dev/null; then
        docker-compose ps
    else
        docker compose ps
    fi
    
    echo ""
    log_info "Access URLs:"
    case $DEPLOYMENT_MODE in
        "development")
            log_info "  Frontend: http://localhost:3000"
            log_info "  Backend API: http://localhost:5000"
            ;;
        "allinone")
            log_info "  Application: http://localhost"
            log_info "  API: http://localhost:5000"
            ;;
        *)
            log_info "  Application: http://localhost"
            ;;
    esac
    
    echo ""
    log_info "Data directory: ${DATA_DIR}"
    log_info "Config directory: ${CONFIG_DIR}"
    log_info "Logs directory: ./logs"
}

# Backup data
backup_data() {
    local backup_dir="./backups/$(date +%Y%m%d_%H%M%S)"
    
    log_step "Creating backup..."
    mkdir -p "$backup_dir"
    
    if [ -d "${DATA_DIR}" ]; then
        cp -r "${DATA_DIR}" "$backup_dir/data"
        log_info "Data backed up to $backup_dir/data"
    fi
    
    if [ -d "./logs" ]; then
        cp -r "./logs" "$backup_dir/logs"
        log_info "Logs backed up to $backup_dir/logs"
    fi
    
    if [ -f "${CONFIG_DIR}/app.env" ]; then
        cp "${CONFIG_DIR}/app.env" "$backup_dir/app.env"
        log_info "Configuration backed up to $backup_dir/app.env"
    fi
    
    log_info "Backup completed: $backup_dir"
}

# Migration helper
migrate_from_local() {
    log_step "Migrating from local installation..."
    
    # Look for existing data
    local local_data_dirs=("./server/data" "./data" "./migrations.db")
    
    for data_dir in "${local_data_dirs[@]}"; do
        if [ -e "$data_dir" ]; then
            log_info "Found local data: $data_dir"
            mkdir -p "${DATA_DIR}"
            cp -r "$data_dir"/* "${DATA_DIR}/" 2>/dev/null || cp "$data_dir" "${DATA_DIR}/" 2>/dev/null || true
            log_info "Migrated data to ${DATA_DIR}"
        fi
    done
    
    # Look for existing configuration
    if [ -f ".env" ]; then
        log_info "Found local .env file, copying to ${CONFIG_DIR}/app.env"
        cp ".env" "${CONFIG_DIR}/app.env"
    fi
}

# Cleanup
cleanup() {
    log_step "Cleaning up..."
    
    if command -v docker-compose &> /dev/null; then
        docker-compose down
    else
        docker compose down
    fi
    
    # Remove override file
    rm -f docker-compose.override.yml
    
    log_info "Cleanup completed"
}

# Show help
show_help() {
    echo "S3 Migration Scheduler - Docker Deployment Script"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  deploy      Deploy the application (default)"
    echo "  status      Show deployment status"
    echo "  backup      Create backup of data and configuration"
    echo "  migrate     Migrate from local installation"
    echo "  cleanup     Stop and cleanup deployment"
    echo "  help        Show this help"
    echo ""
    echo "Environment variables:"
    echo "  DEPLOYMENT_MODE         Deployment mode: development|production|allinone (default: production)"
    echo "  DOCKER_IMAGE_PREFIX     Docker image prefix (default: your-username/s3-migration-scheduler)"
    echo "  VERSION                 Image version tag (default: latest)"
    echo "  DATA_DIR                Data directory (default: ./data)"
    echo "  CONFIG_DIR              Configuration directory (default: ./config)"
    echo ""
    echo "Examples:"
    echo "  # Deploy in production mode"
    echo "  ./scripts/docker-deploy.sh deploy"
    echo ""
    echo "  # Deploy in development mode"
    echo "  DEPLOYMENT_MODE=development ./scripts/docker-deploy.sh deploy"
    echo ""
    echo "  # Deploy all-in-one container"
    echo "  DEPLOYMENT_MODE=allinone ./scripts/docker-deploy.sh deploy"
    echo ""
    echo "  # Use custom image prefix"
    echo "  DOCKER_IMAGE_PREFIX=myregistry/s3-migration ./scripts/docker-deploy.sh deploy"
}

# Main function
main() {
    local command=${1:-deploy}
    
    case $command in
        "deploy")
            check_requirements
            setup_directories
            deploy "$DEPLOYMENT_MODE"
            show_status
            ;;
        "status")
            show_status
            ;;
        "backup")
            backup_data
            ;;
        "migrate")
            check_requirements
            setup_directories
            migrate_from_local
            deploy "$DEPLOYMENT_MODE"
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"