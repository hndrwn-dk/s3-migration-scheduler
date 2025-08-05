#!/bin/bash

# S3 Migration Scheduler - Docker Build and Push Script
# This script builds and pushes Docker images to Docker Hub

set -e

# Configuration
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-your-username}"
IMAGE_NAME="s3-migration-scheduler"
VERSION="${VERSION:-latest}"
PLATFORMS="linux/amd64,linux/arm64"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running"
        exit 1
    fi
}

# Check if buildx is available for multi-platform builds
check_buildx() {
    if ! docker buildx version &> /dev/null; then
        log_warn "Docker buildx not available. Multi-platform builds will not be supported."
        return 1
    fi
    return 0
}

# Setup buildx builder
setup_buildx() {
    if check_buildx; then
        log_info "Setting up Docker buildx for multi-platform builds..."
        docker buildx create --name s3-migration-builder --use 2>/dev/null || true
        docker buildx inspect --bootstrap
    fi
}

# Build and push images
build_and_push() {
    local service=$1
    local dockerfile=$2
    local tag_suffix=$3
    
    log_info "Building ${service} image..."
    
    if check_buildx; then
        # Multi-platform build with buildx
        docker buildx build \
            --platform ${PLATFORMS} \
            --file ${dockerfile} \
            --target production \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-${service}:${VERSION}${tag_suffix} \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-${service}:latest${tag_suffix} \
            --push \
            .
    else
        # Single platform build
        docker build \
            --file ${dockerfile} \
            --target production \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-${service}:${VERSION}${tag_suffix} \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-${service}:latest${tag_suffix} \
            .
        
        # Push images
        docker push ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-${service}:${VERSION}${tag_suffix}
        docker push ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-${service}:latest${tag_suffix}
    fi
    
    log_info "Successfully built and pushed ${service} image"
}

# Main build process
main() {
    log_info "Starting Docker build process for S3 Migration Scheduler"
    
    # Check prerequisites
    check_docker
    
    # Login to Docker Hub
    if [ -n "${DOCKER_HUB_TOKEN}" ]; then
        log_info "Logging into Docker Hub using token..."
        echo ${DOCKER_HUB_TOKEN} | docker login --username ${DOCKER_HUB_USERNAME} --password-stdin
    else
        log_info "Please login to Docker Hub manually:"
        docker login --username ${DOCKER_HUB_USERNAME}
    fi
    
    # Setup buildx for multi-platform builds
    setup_buildx
    
    # Build backend image
    build_and_push "backend" "Dockerfile.backend" ""
    
    # Build frontend image
    build_and_push "frontend" "Dockerfile.frontend" ""
    
    # Build all-in-one image (if needed)
    log_info "Building all-in-one image..."
    cat > Dockerfile.allinone << 'EOF'
FROM node:18-alpine AS build-frontend
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

FROM node:18-alpine AS production
RUN apk add --no-cache python3 make g++ sqlite nginx
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
COPY --from=build-frontend /app/build /app/public

# Setup nginx configuration
RUN mkdir -p /etc/nginx/conf.d
COPY <<'NGINXEOF' /etc/nginx/conf.d/default.conf
server {
    listen 80;
    root /app/public;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
NGINXEOF

# Create startup script
COPY <<'STARTEOF' /app/start.sh
#!/bin/sh
nginx &
exec node index.js
STARTEOF

RUN chmod +x /app/start.sh
EXPOSE 80 5000
CMD ["/app/start.sh"]
EOF
    
    if check_buildx; then
        docker buildx build \
            --platform ${PLATFORMS} \
            --file Dockerfile.allinone \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${VERSION} \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:latest \
            --push \
            .
    else
        docker build \
            --file Dockerfile.allinone \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${VERSION} \
            --tag ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:latest \
            .
        docker push ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${VERSION}
        docker push ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:latest
    fi
    
    # Cleanup
    rm -f Dockerfile.allinone
    
    log_info "All images built and pushed successfully!"
    log_info "Available images:"
    log_info "  - ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-backend:${VERSION}"
    log_info "  - ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}-frontend:${VERSION}"
    log_info "  - ${DOCKER_HUB_USERNAME}/${IMAGE_NAME}:${VERSION} (all-in-one)"
}

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Build and push S3 Migration Scheduler Docker images"
    echo ""
    echo "Environment variables:"
    echo "  DOCKER_HUB_USERNAME    Docker Hub username (required)"
    echo "  DOCKER_HUB_TOKEN       Docker Hub access token (optional)"
    echo "  VERSION                Image version tag (default: latest)"
    echo ""
    echo "Examples:"
    echo "  DOCKER_HUB_USERNAME=myuser ./scripts/docker-build.sh"
    echo "  VERSION=v1.2.0 DOCKER_HUB_USERNAME=myuser ./scripts/docker-build.sh"
}

# Parse command line arguments
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac