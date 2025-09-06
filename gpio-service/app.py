#!/usr/bin/env python3
"""
GPIO Relay Control Service
Provides HTTP API for controlling GPIO relay on Raspberry Pi
"""

from flask import Flask, request, jsonify
import threading
import os
import sys

app = Flask(__name__)

# GPIO setup
gpio_available = False
GPIO = None

try:
    import RPi.GPIO as GPIO
    gpio_available = True
    print("[GPIO] RPi.GPIO library loaded successfully")
except ImportError:
    print("[GPIO] RPi.GPIO not available - running in mock mode")

# Configuration from environment
RELAY_PIN = int(os.getenv('RELAY_PIN', '17'))
RELAY_ACTIVE_HIGH = os.getenv('RELAY_ACTIVE_HIGH', '0').lower() in ('1', 'true')
GPIO_ENABLED = os.getenv('GPIO_ENABLED', '1').lower() in ('1', 'true')

# Global state
blink_thread = None
blink_stop_event = threading.Event()

def init_gpio():
    """Initialize GPIO if available and enabled"""
    global gpio_available
    
    if not gpio_available or not GPIO_ENABLED:
        print(f"[GPIO] GPIO disabled or not available (available={gpio_available}, enabled={GPIO_ENABLED})")
        return
    
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(RELAY_PIN, GPIO.OUT)
        
        # Set initial state to OFF using the same logic as set_relay_state
        if RELAY_ACTIVE_HIGH:
            # Active high: HIGH=ON, LOW=OFF → Set LOW for OFF
            GPIO.output(RELAY_PIN, GPIO.LOW)
            expected_pin_state = "LOW"
        else:
            # Active low: LOW=ON, HIGH=OFF → Set HIGH for OFF  
            GPIO.output(RELAY_PIN, GPIO.HIGH)
            expected_pin_state = "HIGH"
        
        print(f"[GPIO] Initialized BCM pin {RELAY_PIN}, active_high={RELAY_ACTIVE_HIGH}")
        print(f"[GPIO] Relay set to OFF (pin state: {expected_pin_state})")
    except Exception as e:
        print(f"[GPIO] Failed to initialize GPIO: {e}")
        gpio_available = False

def set_relay_state(on):
    """Set relay state: True=ON, False=OFF"""
    if not gpio_available:
        print(f"[GPIO] Mock: Relay {'ON' if on else 'OFF'}")
        return True
    
    try:
        if RELAY_ACTIVE_HIGH:
            # Active high: HIGH=ON, LOW=OFF
            GPIO.output(RELAY_PIN, GPIO.HIGH if on else GPIO.LOW)
        else:
            # Active low: LOW=ON, HIGH=OFF
            GPIO.output(RELAY_PIN, GPIO.LOW if on else GPIO.HIGH)
        
        state_str = 'ON' if on else 'OFF'
        pin_state = 'HIGH' if GPIO.input(RELAY_PIN) else 'LOW'
        print(f"[GPIO] Relay {state_str} (pin {RELAY_PIN} = {pin_state})")
        return True
    except Exception as e:
        print(f"[GPIO] Failed to set relay state: {e}")
        return False

def blink_relay_thread(duration_ms):
    """Background thread for relay blinking"""
    global blink_stop_event
    
    duration_sec = duration_ms / 1000.0
    print(f"[GPIO] Starting blink for {duration_sec}s")
    
    # Turn ON
    if set_relay_state(True):
        # Wait for duration or stop event
        if blink_stop_event.wait(duration_sec):
            print("[GPIO] Blink interrupted by stop event")
        else:
            print("[GPIO] Blink duration completed")
        
        # Turn OFF
        set_relay_state(False)
    
    print("[GPIO] Blink finished")

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'gpio_available': gpio_available,
        'gpio_enabled': GPIO_ENABLED,
        'relay_pin': RELAY_PIN,
        'active_high': RELAY_ACTIVE_HIGH
    })

@app.route('/relay/on', methods=['POST'])
def relay_on():
    """Turn relay ON"""
    success = set_relay_state(True)
    return jsonify({
        'status': 'ok' if success else 'error',
        'action': 'on',
        'relay_pin': RELAY_PIN
    }), 200 if success else 500

@app.route('/relay/off', methods=['POST'])
def relay_off():
    """Turn relay OFF"""
    global blink_thread, blink_stop_event
    
    # Stop any ongoing blink
    if blink_thread and blink_thread.is_alive():
        blink_stop_event.set()
        blink_thread.join(timeout=1.0)
        blink_stop_event.clear()
    
    success = set_relay_state(False)
    return jsonify({
        'status': 'ok' if success else 'error',
        'action': 'off',
        'relay_pin': RELAY_PIN
    }), 200 if success else 500

@app.route('/relay/blink', methods=['POST'])
def relay_blink():
    """Blink relay for specified duration"""
    global blink_thread, blink_stop_event
    
    # Get duration from query params or JSON body
    duration_ms = None
    if request.is_json:
        duration_ms = request.json.get('duration_ms')
    else:
        duration_ms = request.args.get('duration_ms')
    
    try:
        duration_ms = int(duration_ms) if duration_ms else 3000
        duration_ms = max(0, duration_ms)  # Ensure non-negative
    except (ValueError, TypeError):
        duration_ms = 3000
    
    # Stop any ongoing blink
    if blink_thread and blink_thread.is_alive():
        blink_stop_event.set()
        blink_thread.join(timeout=1.0)
        blink_stop_event.clear()
    
    # Start new blink
    blink_thread = threading.Thread(target=blink_relay_thread, args=(duration_ms,))
    blink_thread.daemon = True
    blink_thread.start()
    
    return jsonify({
        'status': 'ok',
        'action': 'blink',
        'duration_ms': duration_ms,
        'relay_pin': RELAY_PIN
    })

@app.route('/relay/status')
def relay_status():
    """Get current relay status"""
    if not gpio_available:
        return jsonify({
            'status': 'mock',
            'gpio_available': False,
            'relay_pin': RELAY_PIN
        })
    
    try:
        pin_state = GPIO.input(RELAY_PIN)
        relay_on = pin_state if RELAY_ACTIVE_HIGH else not pin_state
        
        return jsonify({
            'status': 'ok',
            'gpio_available': True,
            'relay_pin': RELAY_PIN,
            'pin_state': 'HIGH' if pin_state else 'LOW',
            'relay_on': relay_on,
            'active_high': RELAY_ACTIVE_HIGH
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e),
            'relay_pin': RELAY_PIN
        }), 500

def cleanup():
    """Cleanup GPIO on exit"""
    global blink_thread, blink_stop_event
    
    print("[GPIO] Cleaning up...")
    
    # Stop blink thread
    if blink_thread and blink_thread.is_alive():
        blink_stop_event.set()
        blink_thread.join(timeout=2.0)
    
    # Turn relay OFF
    set_relay_state(False)
    
    # Cleanup GPIO
    if gpio_available and GPIO:
        try:
            GPIO.cleanup()
            print("[GPIO] GPIO cleanup completed")
        except Exception as e:
            print(f"[GPIO] Error during cleanup: {e}")

if __name__ == '__main__':
    import atexit
    import signal
    
    # Register cleanup handlers
    atexit.register(cleanup)
    signal.signal(signal.SIGTERM, lambda s, f: cleanup() or sys.exit(0))
    signal.signal(signal.SIGINT, lambda s, f: cleanup() or sys.exit(0))
    
    # Initialize GPIO
    init_gpio()
    
    # Start Flask app
    print("[GPIO] Starting GPIO service on port 3001")
    print(f"[GPIO] Configuration: pin={RELAY_PIN}, active_high={RELAY_ACTIVE_HIGH}, enabled={GPIO_ENABLED}")
    
    app.run(host='0.0.0.0', port=3001, debug=False)
