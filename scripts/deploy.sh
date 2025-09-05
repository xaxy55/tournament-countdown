#!/bin/bash

# Tournament Countdown Deployment Script
# This script helps deploy the application using the GitHub Container Registry image

set -e

REGISTRY="ghcr.io"
IMAGE_NAME="xaxy55/tournament-countdown"
TAG="${1:-latest}"
CONTAINER_NAME="counter-web"

echo "🚀 Tournament Countdown Deployment Script"
echo "==========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  docker-compose not found, falling back to docker run"
    USE_COMPOSE=false
else
    USE_COMPOSE=true
fi

echo "📦 Using image: $REGISTRY/$IMAGE_NAME:$TAG"
echo ""

# Function to deploy with docker-compose
deploy_with_compose() {
    echo "🐳 Deploying with Docker Compose..."
    
    # Download docker-compose.prod.yml if it doesn't exist
    if [ ! -f "docker-compose.prod.yml" ]; then
        echo "📥 Downloading docker-compose.prod.yml..."
        curl -s -o docker-compose.prod.yml "https://raw.githubusercontent.com/xaxy55/tournament-countdown/main/docker-compose.prod.yml"
    fi
    
    # Update the image tag in the compose file
    sed -i.bak "s|ghcr.io/xaxy55/tournament-countdown:.*|$REGISTRY/$IMAGE_NAME:$TAG|g" docker-compose.prod.yml
    
    # Pull the image
    docker-compose -f docker-compose.prod.yml pull
    
    # Start the application
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Application deployed successfully!"
    echo "🌐 Access the application at: http://localhost:3000"
}

# Function to deploy with docker run
deploy_with_docker() {
    echo "🐳 Deploying with docker run..."
    
    # Stop and remove existing container
    docker stop $CONTAINER_NAME 2>/dev/null || true
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # Pull the latest image
    docker pull $REGISTRY/$IMAGE_NAME:$TAG
    
    # Create data directory
    mkdir -p ./data
    
    # Run the container
    docker run -d \
        --name $CONTAINER_NAME \
        -p 3000:3000 \
        -e GPIO_ENABLED=true \
        -e RELAY_PIN=17 \
        -e RELAY_ACTIVE_HIGH=1 \
        -e BLINK_DURATION_MS=10000 \
        -v "$(pwd)/data:/app/data" \
        -v /dev/gpiomem:/dev/gpiomem \
        --device=/dev/gpiomem:/dev/gpiomem \
        --privileged \
        --user root \
        --restart unless-stopped \
        $REGISTRY/$IMAGE_NAME:$TAG
    
    echo "✅ Application deployed successfully!"
    echo "🌐 Access the application at: http://localhost:3000"
}

# Check if running on Raspberry Pi
if grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "🥧 Raspberry Pi detected - GPIO will be enabled"
    PI_DETECTED=true
else
    echo "💻 Not running on Raspberry Pi - GPIO will be disabled"
    PI_DETECTED=false
fi

echo ""

# Deploy based on available tools
if [ "$USE_COMPOSE" = true ]; then
    deploy_with_compose
else
    deploy_with_docker
fi

echo ""
echo "📋 Useful commands:"
echo "  View logs:     docker logs $CONTAINER_NAME"
echo "  Stop app:      docker stop $CONTAINER_NAME"
echo "  Restart app:   docker restart $CONTAINER_NAME"
echo "  GPIO test:     docker exec -it $CONTAINER_NAME npm run gpio-test"
echo ""

# Show container status
echo "📊 Container status:"
docker ps --filter name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

if [ "$PI_DETECTED" = true ]; then
    echo ""
    echo "🔧 To test GPIO functionality:"
    echo "  docker exec -it $CONTAINER_NAME npm run gpio-test"
fi
