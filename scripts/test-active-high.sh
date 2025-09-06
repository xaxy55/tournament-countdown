#!/bin/bash

echo "=== Testing Active HIGH Configuration ==="
echo "If your relay is actually active HIGH, let's test..."
echo ""

# Temporarily change to active HIGH
echo "Setting RELAY_ACTIVE_HIGH=1 temporarily..."
docker exec counter-web-gpio-service-1 sh -c 'export RELAY_ACTIVE_HIGH=1 && python3 -c "
import RPi.GPIO as GPIO
import os
RELAY_PIN = 17
RELAY_ACTIVE_HIGH = True

GPIO.setmode(GPIO.BCM)
GPIO.setup(RELAY_PIN, GPIO.OUT)

print(\"Testing ACTIVE HIGH mode:\")
print(\"Setting relay OFF (should be LOW)\")
GPIO.output(RELAY_PIN, GPIO.LOW)
import time
time.sleep(2)

print(\"Setting relay ON (should be HIGH)\")  
GPIO.output(RELAY_PIN, GPIO.HIGH)
time.sleep(2)

print(\"Setting relay OFF again (should be LOW)\")
GPIO.output(RELAY_PIN, GPIO.LOW)

GPIO.cleanup()
"'

echo ""
echo "Did you see the LED change during that test?"
echo "If YES, your relay is active HIGH, not active LOW!"
