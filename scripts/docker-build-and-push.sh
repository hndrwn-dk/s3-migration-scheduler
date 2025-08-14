#!/bin/bash

# S3 Migration Scheduler - Docker Build and Push Script
# This script builds the Docker image and pushes it to Docker Hub

set -e  # Exit on any error

# Configuration
DOCKER_USERNAME="hendrawandaryono"
IMAGE_NAME="s3-migration-scheduler"
VERSION="1.1.0"
LATEST_TAG="latest"

# Full image names
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"
VERSION_TAG="${FULL_IMAGE_NAME}:${VERSION}"
LATEST_TAG_FULL="${FULL_IMAGE_NAME}:${LATEST_TAG}"

echo "🚀 Building and pushing S3 Migration Scheduler v${VERSION} to Docker Hub"
echo "═══════════════════════════════════════════════════════════════════════"

# Function to check if docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        echo "❌ Error: Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if user is logged in to Docker Hub
check_docker_login() {
    if ! docker info | grep -q "Username"; then
        echo "⚠️  You are not logged in to Docker Hub."
        echo "Please run: docker login"
        echo "Then try again."
        exit 1
    fi
}

# Function to build the image
build_image() {
    echo "🔨 Building Docker image..."
    echo "Image: ${VERSION_TAG}"
    echo ""
    
    # Build the image with version tag
    docker build -t "${VERSION_TAG}" -t "${LATEST_TAG_FULL}" .
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker image built successfully!"
    else
        echo "❌ Failed to build Docker image"
        exit 1
    fi
}

# Function to push the image
push_image() {
    echo ""
    echo "📤 Pushing image to Docker Hub..."
    
    # Push version tag
    echo "Pushing ${VERSION_TAG}..."
    docker push "${VERSION_TAG}"
    
    # Push latest tag
    echo "Pushing ${LATEST_TAG_FULL}..."
    docker push "${LATEST_TAG_FULL}"
    
    if [ $? -eq 0 ]; then
        echo "✅ Images pushed successfully!"
    else
        echo "❌ Failed to push images"
        exit 1
    fi
}

# Function to show usage information
show_usage() {
    echo ""
    echo "📋 Usage Information:"
    echo "───────────────────────────────────────────────────────────────"
    echo ""
    echo "🐳 Docker Image Published:"
    echo "   • Repository: ${FULL_IMAGE_NAME}"
    echo "   • Version Tag: ${VERSION}"
    echo "   • Latest Tag: ${LATEST_TAG}"
    echo ""
    echo "🚀 To run the container:"
    echo "   docker run -d -p 5000:5000 ${VERSION_TAG}"
    echo ""
    echo "🔧 To use with docker-compose:"
    echo "   docker-compose up -d"
    echo ""
    echo "🌐 Docker Hub URL:"
    echo "   https://hub.docker.com/r/${FULL_IMAGE_NAME}"
}

# Main execution
main() {
    echo "Step 1: Checking Docker..."
    check_docker
    
    echo "Step 2: Checking Docker Hub login..."
    check_docker_login
    
    echo "Step 3: Building image..."
    build_image
    
    echo "Step 4: Pushing to Docker Hub..."
    push_image
    
    echo ""
    echo "🎉 SUCCESS! Docker image published to Docker Hub"
    show_usage
}

# Run the main function
main "$@"