#!/bin/bash

# Tournament Countdown Startup Script
# Run this script to properly configure GPIO and start the Docker container

set -e

echo "🏆 Tournament Countdown Startup"
echo "=============================="
git pull

# Step 1: Enable pigpio daemon (for Remote GPIO)
echo "🔧 Setting up pigpio daemon..."
if command -v pigpiod &> /dev/null; then
    # Start pigpio daemon if not running
    if ! pgrep -x "pigpiod" > /dev/null; then
        sudo pigpiod
        echo "✅ pigpiod started"
    else
        echo "✅ pigpiod already running"
    fi
    
    # Also configure pin 17 manually (as backup)
    echo "🔧 Configuring GPIO pin 17 as backup..."
    if command -v raspi-gpio &> /dev/null; then
        raspi-gpio set 17 pn
        echo "✅ Pin 17 configured with raspi-gpio (pull none)"
    elif command -v pinctrl &> /dev/null; then
        pinctrl set 17 ip,pn
        echo "✅ Pin 17 configured with pinctrl (input, pull none)"
    fi
else
    echo "❌ pigpiod not found, installing..."
    sudo apt update
    sudo apt install -y pigpio
    sudo pigpiod
    echo "✅ pigpio installed and started"
    
    # Configure pin 17 manually
    echo "🔧 Configuring GPIO pin 17..."
    if command -v raspi-gpio &> /dev/null; then
        raspi-gpio set 17 pn
        echo "✅ Pin 17 configured with raspi-gpio (pull none)"
    elif command -v pinctrl &> /dev/null; then
        pinctrl set 17 ip,pn
        echo "✅ Pin 17 configured with pinctrl (input, pull none)"
    else
        echo "❌ Neither raspi-gpio nor pinctrl found"
        echo "💡 You may need to run: sudo raspi-gpio set 17 pn"
        exit 1
    fi
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
