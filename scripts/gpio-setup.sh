#!/bin/bash

# GPIO Setup Script for Tournament Countdown
# This script configures GPIO pin 17 (BCM numbering) for proper relay control

set -e

echo "🔧 Setting up GPIO pin 17 for relay control..."

# Check if we're on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "⚠️  Not running on Raspberry Pi - skipping GPIO setup"
    exit 0
fi

# Set BCM pin 17 to no pull resistor (this was the fix!)
if command -v raspi-gpio &> /dev/null; then
    echo "📍 Using raspi-gpio to configure pin 17..."
    raspi-gpio set 17 pn
    echo "✅ Pin 17 set to 'pull none' (no pull resistor)"
    
    # Show current pin status
    echo "📊 Current pin 17 status:"
    raspi-gpio get 17
elif command -v pinctrl &> /dev/null; then
    echo "📍 Using pinctrl to configure pin 17..."
    pinctrl set 17 ip,pn
    echo "✅ Pin 17 set to input with no pull resistor"
    
    # Show current pin status
    echo "📊 Current pin 17 status:"
    pinctrl get 17
else
    echo "❌ Neither raspi-gpio nor pinctrl found - cannot configure GPIO"
    exit 1
fi

echo "🎉 GPIO setup complete!"
echo "💡 Pin 17 is now ready for software control"
