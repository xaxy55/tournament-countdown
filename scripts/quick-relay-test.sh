#!/bin/bash

echo "=== Quick Relay Click Test ==="
echo "Listen carefully for clicking sounds..."
echo ""

echo "Turning relay OFF..."
curl -s -X POST http://localhost:3001/relay/off > /dev/null
echo "Did you hear a CLICK? (relay should open)"
sleep 2

echo "Turning relay ON..."
curl -s -X POST http://localhost:3001/relay/on > /dev/null
echo "Did you hear a CLICK? (relay should close)"
sleep 2

echo "Turning relay OFF again..."
curl -s -X POST http://localhost:3001/relay/off > /dev/null
echo "Did you hear a CLICK? (relay should open)"
sleep 2

echo ""
echo "=== Hardware Check ==="
echo "1. Do you hear clicking sounds when relay changes?"
echo "2. How many LEDs are on your relay module?"
echo "3. What colors are the LEDs?"
echo "4. Is there an LED labeled 'PWR' or 'POWER'?"
echo "5. Is there an LED labeled 'RELAY' or 'STATUS'?"
