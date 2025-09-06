import { createRequire } from 'module';

/**
 * Pigpio-based GPIO/Relay controller
 * Uses the pigpio daemon for more reliable GPIO control
 */
export class PigpioRelayController {
  constructor(options = {}) {
    this.enabled = !!options.enabled;
    this.pinNumber = options.pinNumber ?? 17; // BCM numbering (will work correctly with pigpio)
    this.activeHigh = options.activeHigh ?? true; // active-low relays set false
    this.hz = Number(options.hz ?? 2); // blink frequency when done
    this.defaultDurationMs = Number(options.defaultDurationMs ?? 10000); // ms to blink after done
    
    // Internal state
    this.pigpio = null;
    this.currentOn = false;
    this.blinkInterval = null;
    this.stopTimeout = null;
    this.connected = false;
  }

  // Try to load the pigpio library
  tryLoadPigpio() {
    if (!this.enabled) return false;
    try {
      const require = createRequire(import.meta.url);
      this.pigpio = require('pigpio').Gpio;
      if (!this.pigpio) {
        throw new Error('pigpio.Gpio not found');
      }
      return true;
    } catch (e) {
      console.warn('[GPIO] Failed to load pigpio:', e?.message || e);
      console.warn('[GPIO] Install with: sudo apt install pigpio && npm install pigpio');
      console.warn('[GPIO] Enable with: sudo systemctl enable pigpiod && sudo systemctl start pigpiod');
      return false;
    }
  }

  // Initialize the GPIO using pigpio
  async init() {
    if (!this.enabled) return;

    if (!this.tryLoadPigpio()) {
      console.warn('[GPIO] pigpio not available, GPIO disabled');
      this.enabled = false;
      return;
    }

    try {
      console.log(`[GPIO] Attempting to initialize BCM pin ${this.pinNumber} via pigpio`);
      
      // Create GPIO instance (pigpio uses BCM numbering correctly)
      this.pin = new this.pigpio(this.pinNumber, { mode: this.pigpio.OUTPUT });
      
      // Set initial state
      this.setRelay(false);
      this.connected = true;
      
      // Set up cleanup handlers
      const cleanup = () => {
        try { this.dispose(); } catch {}
      };
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
      process.once('exit', cleanup);
      
      console.log(`[GPIO] Pin ${this.pinNumber} initialized successfully via pigpio (activeHigh=${this.activeHigh})`);
    } catch (e) {
      console.warn('[GPIO] Failed to initialize via pigpio:', e?.message || e);
      console.warn('[GPIO] This may be due to:');
      console.warn('[GPIO]   - pigpiod daemon not running (try: sudo systemctl start pigpiod)');
      console.warn('[GPIO]   - Pin already in use');
      console.warn('[GPIO]   - Insufficient permissions');
      console.warn('[GPIO]   - Remote GPIO not enabled in raspi-config');
      this.enabled = false;
    }
  }

  // Set relay state
  setRelay(on) {
    this.currentOn = !!on;
    console.log(`[GPIO] Setting relay to ${on ? 'HIGH' : 'LOW'} via pigpio`);
    
    if (!this.enabled || !this.pin || !this.connected) return;

    try {
      const value = this.activeHigh ? (on ? 1 : 0) : (on ? 0 : 1);
      this.pin.digitalWrite(value);
      console.log(`[GPIO] Successfully wrote value ${value} to pin ${this.pinNumber} via pigpio`);
    } catch (e) {
      console.warn('[GPIO] pigpio digitalWrite failed:', e?.message || e);
    }
  }

  // Start blinking (simplified - just turn on for duration)
  startBlinking(durationMs) {
    if (!this.enabled || !this.connected) return;
    
    const dur = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs)) : this.defaultDurationMs;
    console.log(`[GPIO] Starting LED blink for ${dur}ms via pigpio`);
    this.stopBlinking();
    
    // For LEDs with built-in blinking, just turn on and leave it on
    this.setRelay(true);
    
    // Set timeout to turn off after duration (if duration > 0)
    if (dur > 0) {
      this.stopTimeout = setTimeout(() => {
        console.log(`[GPIO] Blink duration expired, stopping via pigpio`);
        this.stopBlinking();
      }, dur);
    }
  }

  // Stop blinking
  stopBlinking() {
    console.log(`[GPIO] Stopping LED blink via pigpio`);
    if (this.blinkInterval) { 
      clearInterval(this.blinkInterval); 
      this.blinkInterval = null; 
    }
    if (this.stopTimeout) { 
      clearTimeout(this.stopTimeout); 
      this.stopTimeout = null; 
    }
    this.setRelay(false);
  }

  // Clean up resources
  dispose() {
    try { 
      this.stopBlinking(); 
    } catch {}
    
    if (this.pin && this.connected) {
      try {
        this.setRelay(false);
        // pigpio handles cleanup automatically
        console.log(`[GPIO] Pin ${this.pinNumber} cleaned up via pigpio`);
      } catch (e) {
        console.warn(`[GPIO] Failed to cleanup pin ${this.pinNumber} via pigpio:`, e?.message || e);
      }
      this.pin = null;
      this.connected = false;
    }
  }
}
