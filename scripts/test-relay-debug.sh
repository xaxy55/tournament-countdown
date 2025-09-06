#!/bin/bash

echo "=== Relay Hardware Debug Test ==="
echo "Testing GPIO service relay control..."
echo ""

# Get initial status
echo "1. Initial relay status:"
curl -s http://localhost:3001/relay/status | jq '.'
echo ""

# Turn relay OFF
echo "2. Turning relay OFF..."
curl -s -X POST http://localhost:3001/relay/off
sleep 1
curl -s http://localhost:3001/relay/status | jq '.'
echo ""
echo "   → Pin should be HIGH (relay OFF for active LOW)"
echo "   → Check if LED turns OFF now"
echo ""

# Wait for user observation
echo "Press Enter after checking LED state..."
read

# Turn relay ON
echo "3. Turning relay ON..."
curl -s -X POST http://localhost:3001/relay/on
sleep 1
curl -s http://localhost:3001/relay/status | jq '.'
echo ""
echo "   → Pin should be LOW (relay ON for active LOW)"
echo "   → Check if LED turns ON now"
echo ""

# Wait for user observation
echo "Press Enter after checking LED state..."
read

# Test blinking
echo "4. Testing blink function..."
curl -s -X POST http://localhost:3001/relay/blink
echo ""
echo "   → LED should blink for 3 seconds"
echo "   → Check if you see any blinking"
echo ""

echo "=== Debug Questions ==="
echo "1. Do you see TWO LEDs on the relay module?"
echo "   - Power LED (always on when powered)"
echo "   - Relay status LED (changes with relay state)"
echo ""
echo "2. Is there a clicking sound when relay changes state?"
echo ""
echo "3. What color is the LED that stays on?"
echo "4. What color is the LED that should change?"
echo ""
echo "Test complete. Please report your observations."
