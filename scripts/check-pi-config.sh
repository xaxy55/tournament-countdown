#!/bin/bash

# Raspberry Pi GPIO Configuration Checker
# This script checks if GPIO and related features are properly configured

echo "🥧 Raspberry Pi GPIO Configuration Checker"
echo "=========================================="
echo ""

# Check if we're on a Raspberry Pi
if ! grep -q "Raspberry Pi" /proc/cpuinfo 2>/dev/null; then
    echo "❌ This script is designed for Raspberry Pi only"
    exit 1
fi

echo "📋 Current Configuration Status:"
echo ""

# Check GPIO
echo -n "GPIO Support: "
if sudo raspi-config nonint get_gpio 2>/dev/null; then
    if [ $(sudo raspi-config nonint get_gpio) -eq 0 ]; then
        echo "✅ ENABLED"
    else
        echo "❌ DISABLED"
        echo "   Run: sudo raspi-config nonint do_gpio 0"
    fi
else
    echo "⚠️  Cannot determine status"
fi

# Check Device Tree
echo -n "Device Tree: "
if sudo raspi-config nonint get_device_tree 2>/dev/null; then
    if [ $(sudo raspi-config nonint get_device_tree) -eq 0 ]; then
        echo "✅ ENABLED"
    else
        echo "❌ DISABLED"
        echo "   Run: sudo raspi-config nonint do_device_tree 0"
    fi
else
    echo "⚠️  Cannot determine status"
fi

# Check SPI
echo -n "SPI: "
if sudo raspi-config nonint get_spi 2>/dev/null; then
    if [ $(sudo raspi-config nonint get_spi) -eq 0 ]; then
        echo "✅ ENABLED"
    else
        echo "⚠️  DISABLED (usually not needed for basic GPIO)"
    fi
else
    echo "⚠️  Cannot determine status"
fi

# Check I2C
echo -n "I2C: "
if sudo raspi-config nonint get_i2c 2>/dev/null; then
    if [ $(sudo raspi-config nonint get_i2c) -eq 0 ]; then
        echo "✅ ENABLED"
    else
        echo "⚠️  DISABLED (usually not needed for basic GPIO)"
    fi
else
    echo "⚠️  Cannot determine status"
fi

echo ""
echo "🔍 Boot Configuration (/boot/config.txt):"
echo ""

# Check important boot config settings
BOOT_CONFIG="/boot/config.txt"
if [ ! -f "$BOOT_CONFIG" ]; then
    BOOT_CONFIG="/boot/firmware/config.txt"  # Ubuntu style
fi

if [ -f "$BOOT_CONFIG" ]; then
    echo "📄 Checking $BOOT_CONFIG:"
    
    # Check for GPIO-related settings
    if grep -q "^dtparam=gpio=on" "$BOOT_CONFIG"; then
        echo "✅ GPIO explicitly enabled in config"
    elif grep -q "^dtparam=gpio=off" "$BOOT_CONFIG"; then
        echo "❌ GPIO explicitly disabled in config"
        echo "   Remove or comment out: dtparam=gpio=off"
    else
        echo "ℹ️  GPIO not explicitly configured (usually OK)"
    fi
    
    # Check device tree
    if grep -q "^device_tree=" "$BOOT_CONFIG"; then
        echo "ℹ️  Custom device tree configured"
        grep "^device_tree=" "$BOOT_CONFIG"
    fi
    
    # Check if GPIO is disabled
    if grep -q "^dtoverlay=gpio-no-irq" "$BOOT_CONFIG"; then
        echo "⚠️  GPIO IRQ disabled (might affect some GPIO functions)"
    fi
    
else
    echo "❌ Boot config not found at $BOOT_CONFIG"
fi

echo ""
echo "🔧 GPIO Device Files:"
echo ""

# Check GPIO device files
for device in /dev/gpiomem /dev/mem; do
    if [ -e "$device" ]; then
        echo "✅ $device exists"
        ls -la "$device"
    else
        echo "❌ $device missing"
    fi
done

echo ""
echo "📊 GPIO Chip Information:"
echo ""

# Check GPIO chips
if command -v pinctrl &> /dev/null; then
    echo "✅ pinctrl available"
    pinctrl --version 2>/dev/null || echo "pinctrl version unknown"
else
    echo "❌ pinctrl not available"
fi

if [ -d "/sys/class/gpio" ]; then
    echo "✅ GPIO sysfs available"
    echo "   GPIO chips: $(ls /sys/class/gpio/gpiochip* 2>/dev/null | wc -l)"
else
    echo "❌ GPIO sysfs not available"
fi

echo ""
echo "🎯 Recommendations:"
echo ""

# Basic recommendations
echo "For basic GPIO functionality, ensure:"
echo "1. GPIO is enabled: sudo raspi-config nonint do_gpio 0"
echo "2. Device Tree is enabled: sudo raspi-config nonint do_device_tree 0"
echo "3. Reboot after changes: sudo reboot"
echo ""
echo "Then test your Docker container with GPIO enabled."
