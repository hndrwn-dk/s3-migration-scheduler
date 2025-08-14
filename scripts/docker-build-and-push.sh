#!/bin/bash

# S3 Migration Scheduler - Docker Build and Push Script
# This script builds the Docker image and pushes it to Docker Hub

set -e  # Exit on any error

# Configuration
DOCKER_USERNAME="hndrwn"
IMAGE_NAME="s3-migration-scheduler"
VERSION="1.1.0"
LATEST_TAG="latest"

# Full image names
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"
VERSION_TAG="${FULL_IMAGE_NAME}:${VERSION}"
LATEST_TAG_FULL="${FULL_IMAGE_NAME}:${LATEST_TAG}"

echo "Building and pushing S3 Migration Scheduler v${VERSION} to Docker Hub"
echo "======================================================================="

# Function to check if docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "ERROR: Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "Docker is running - OK"
}

# Function to check if user is logged into Docker Hub
check_docker_login() {
    if ! docker info | grep -q "Username:"; then
        echo "WARNING: Cannot verify Docker Hub login status."
        echo "If build fails, please run 'docker login' first."
    else
        echo "Docker Hub login detected - OK"
    fi
}

# Function to build the client
build_client() {
    echo "Step 2: Building React client..."
    cd client
    if [ ! -d "node_modules" ]; then
        echo "Installing client dependencies..."
        npm install
    fi
    echo "Building React application..."
    npm run build
    echo "React client built successfully"
    cd ..
}

# Function to build Docker image
build_image() {
    echo "Step 3: Building Docker image..."
    echo "Building image: ${VERSION_TAG}"
    docker build -t "${VERSION_TAG}" -t "${LATEST_TAG_FULL}" .
    echo "Docker image built successfully"
}

# Function to push to Docker Hub
push_image() {
    echo "Step 4: Pushing to Docker Hub..."
    echo "Pushing ${VERSION_TAG}..."
    docker push "${VERSION_TAG}"
    echo "Pushing ${LATEST_TAG_FULL}..."
    docker push "${LATEST_TAG_FULL}"
    echo "Images pushed successfully to Docker Hub!"
}

# Function to display final information
show_usage() {
    echo ""
    echo "SUCCESS! Docker images published to Docker Hub"
    echo "======================================================================="
    echo "Image: ${FULL_IMAGE_NAME}"
    echo "Tags: ${VERSION}, ${LATEST_TAG}"
    echo ""
    echo "Quick deployment commands:"
    echo "   docker run -d -p 5000:5000 ${VERSION_TAG}"
    echo "   docker-compose up -d"
    echo ""
    echo "Docker Hub: https://hub.docker.com/r/${DOCKER_USERNAME}/${IMAGE_NAME}"
    echo ""
    echo "Build completed successfully!"
}

# Main execution
main() {
    echo "Step 1: Checking Docker and login status..."
    check_docker
    check_docker_login
    build_client
    build_image
    push_image
    show_usage
}

# Run the script
main "$@"