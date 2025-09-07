#!/bin/bash

set -e  # Exit on any error

echo "🚀 Tournament Countdown - Update Script"
echo "======================================="
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."
if ! command_exists git; then
    echo "❌ Git is not installed"
    exit 1
fi

if ! command_exists docker; then
    echo "❌ Docker is not installed"
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi
echo "✅ All prerequisites found"
echo ""

# Get current git info
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "📍 Current: $CURRENT_BRANCH @ $CURRENT_COMMIT"

# Pull latest changes
echo ""
echo "📥 Pulling latest changes from git..."
git fetch origin
git pull origin main

NEW_COMMIT=$(git rev-parse --short HEAD)
if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo "✅ Already up to date (no new commits)"
else
    echo "✅ Updated from $CURRENT_COMMIT to $NEW_COMMIT"
    echo ""
    echo "📝 Recent changes:"
    git log --oneline "$CURRENT_COMMIT".."$NEW_COMMIT" | head -5
fi

echo ""
echo "🐳 Updating Docker containers..."

# Stop current containers gracefully
echo "⏹️  Stopping current containers..."
docker-compose down

# Pull latest image from GitHub Container Registry
echo "📦 Pulling latest image from ghcr.io..."
docker-compose pull

# Start containers
echo "🟢 Starting updated containers..."
docker-compose up -d

# Wait for containers to be ready
echo ""
echo "⏳ Waiting for containers to start..."
sleep 5

# Check container status
echo ""
echo "📊 Container status:"
docker-compose ps

# Check if app is responding
echo ""
echo "🔍 Health check..."
for i in {1..10}; do
    if curl -s -f http://localhost:3000/api/state >/dev/null 2>&1; then
        echo "✅ Application is responding!"
        break
    else
        echo "⏳ Waiting for application... ($i/10)"
        sleep 2
    fi
    
    if [ $i -eq 10 ]; then
        echo "❌ Application not responding after 20 seconds"
        echo "📋 Container logs:"
        docker-compose logs --tail=20
        exit 1
    fi
done

echo ""
echo "🎉 Update completed successfully!"
echo ""
echo "🌐 Tournament Countdown is running at:"
echo "   📱 Main: http://localhost:3000"
echo "   🎮 Control: http://localhost:3000/c"
echo ""
echo "💡 Useful commands:"
echo "   📊 Status:    docker-compose ps"
echo "   📋 Logs:      docker-compose logs -f"
echo "   ⏹️  Stop:      docker-compose down"
echo "   🔄 Restart:   docker-compose restart"