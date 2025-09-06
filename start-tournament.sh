#!/bin/bash

# Tournament Countdown Startup Script
# Run this script to properly configure GPIO and start the Docker container

set -e

echo "🏆 Tournament Countdown Startup"
echo "=============================="
git pull

# Step 1: Configure GPIO pin 17 with proper pull resistor settings
echo "🔧 Configuring GPIO pin 17..."
if command -v raspi-gpio &> /dev/null; then
    sudo raspi-gpio set 17 pn
    echo "✅ Pin 17 configured with raspi-gpio (pull none)"
elif command -v pinctrl &> /dev/null; then
    sudo pinctrl set 17 ip,pn
    echo "✅ Pin 17 configured with pinctrl (input, pull none)"
else
    echo "❌ Neither raspi-gpio nor pinctrl found"
    echo "💡 You may need to run: sudo raspi-gpio set 17 pn"
    echo "💡 This is critical - the LED will stay HIGH without this!"
fi

# Step 1.5: Try to start pigpio daemon (optional, for Remote GPIO)
echo "🔧 Checking for pigpio daemon..."
if command -v pigpiod &> /dev/null; then
    # Start pigpio daemon if not running
    if ! pgrep -x "pigpiod" > /dev/null; then
        sudo pigpiod
        echo "✅ pigpiod started (allows Remote GPIO access)"
    else
        echo "✅ pigpiod already running"
    fi
else
    echo "⚠️  pigpiod not found - install with: sudo apt install pigpio"
    echo "🔄 Container will use direct GPIO access instead"
fi

# Step 2: Show current pin status
echo "📊 Current pin 17 status:"
if command -v raspi-gpio &> /dev/null; then
    raspi-gpio get 17
elif command -v pinctrl &> /dev/null; then
    pinctrl get 17
fi

# Step 3: Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Step 4: Start the tournament countdown
echo "🚀 Starting Tournament Countdown..."
docker-compose -f docker-compose.prod.yml up -d

# Step 5: Show container status
echo "📋 Container status:"
docker-compose ps

echo ""
echo "🎉 Tournament Countdown is now running!"
echo "🌐 Access it at: http://localhost:3000"
echo "📱 Mobile control: http://localhost:3000/c"
echo ""
echo "💡 To watch logs: docker-compose logs -f"
echo "💡 To stop: docker-compose down"
