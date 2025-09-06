#!/bin/bash

echo "=== GPIO Pin Verification Test ==="
echo "Testing if GPIO 17 is actually connected and working..."
echo ""

# Test multiple pins to see if any work
pins=(17 18 27 22 23 24 25)

for pin in "${pins[@]}"; do
    echo "Testing GPIO pin $pin..."
    
    # Test this pin directly
    docker exec counter-web-gpio-service-1 python3 -c "
import RPi.GPIO as GPIO
import time

pin = $pin
try:
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(pin, GPIO.OUT)
    
    print(f'Pin {pin}: Setting HIGH')
    GPIO.output(pin, GPIO.HIGH)
    time.sleep(1)
    
    print(f'Pin {pin}: Setting LOW') 
    GPIO.output(pin, GPIO.LOW)
    time.sleep(1)
    
    print(f'Pin {pin}: Setting HIGH again')
    GPIO.output(pin, GPIO.HIGH)
    time.sleep(1)
    
    GPIO.cleanup()
    print(f'Pin {pin}: Test completed')
except Exception as e:
    print(f'Pin {pin}: ERROR - {e}')
"
    
    echo "Did you see ANY change in LED or hear clicking for pin $pin? (y/n)"
    read -r response
    if [[ "$response" == "y" || "$response" == "Y" ]]; then
        echo "*** PIN $pin WORKS! ***"
        echo "You should use GPIO pin $pin instead of 17"
        break
    fi
    echo ""
done

echo ""
echo "=== Physical Wiring Check ==="
echo "Please verify:"
echo "1. GPIO 17 wire is connected to relay module signal pin"
echo "2. Relay module has 5V/3.3V power connection"
echo "3. Relay module has ground connection"
echo "4. Check if GPIO 17 = Physical pin 11 on the Pi header"
