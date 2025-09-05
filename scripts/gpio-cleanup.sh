#!/bin/bash

# GPIO Cleanup Script for Raspberry Pi
# This script releases GPIO pins that may be stuck in use

set -e

PIN="${1:-17}"  # Default to pin 17, or use first argument

echo "🔧 GPIO Cleanup Script"
echo "====================="
echo ""

# Check if we're on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "❌ This script is designed for Raspberry Pi only"
    exit 1
fi

echo "📍 Releasing GPIO pin $PIN..."

# Method 1: Use modern pinctrl command (preferred)
if command -v pinctrl &> /dev/null; then
    echo "🔄 Using pinctrl (modern method)..."
    pinctrl set $PIN ip
    echo "✅ Pin $PIN set to input (released)"
    
    # Show current pin status
    echo ""
    echo "📊 Current pin status:"
    pinctrl get $PIN
else
    echo "⚠️  pinctrl not found, falling back to legacy methods..."
    
    # Method 2: Use legacy raspi-gpio (deprecated but might still work)
    if command -v raspi-gpio &> /dev/null; then
        echo "🔄 Using raspi-gpio (legacy method)..."
        raspi-gpio set $PIN ip
        echo "✅ Pin $PIN set to input (released)"
        
        # Show current pin status
        echo ""
        echo "📊 Current pin status:"
        raspi-gpio get $PIN
    else
        # Method 3: Direct sysfs manipulation (last resort)
        echo "🔄 Using sysfs (direct method)..."
        if [ -w /sys/class/gpio/unexport ]; then
            echo $PIN > /sys/class/gpio/unexport 2>/dev/null || true
            echo "✅ Pin $PIN unexported via sysfs"
        else
            echo "❌ Cannot write to /sys/class/gpio/unexport (need root?)"
            exit 1
        fi
    fi
fi

echo ""
echo "🎉 GPIO pin $PIN should now be released!"
echo ""
echo "💡 You can now restart your application:"
echo "   docker-compose restart"
echo ""
echo "🔍 To check all GPIO pins:"
if command -v pinctrl &> /dev/null; then
    echo "   pinctrl get"
else
    echo "   raspi-gpio get"
fi
