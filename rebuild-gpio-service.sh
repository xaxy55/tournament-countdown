#!/bin/bash

echo "🔄 Rebuilding and restarting services with GPIO service fix..."

# Stop current services
echo "Stopping services..."
docker-compose -f docker-compose.prod.yml down

# Rebuild the gpio-service (force rebuild to pick up code changes)
echo "Rebuilding GPIO service..."
docker-compose -f docker-compose.prod.yml build --no-cache gpio-service

# Start all services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Services restarted with fixed GPIO service"
echo ""
echo "📋 Container status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "📝 To view logs:"
echo "docker-compose -f docker-compose.prod.yml logs -f"
