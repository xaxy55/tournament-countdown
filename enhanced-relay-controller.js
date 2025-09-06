import fs from 'fs';
import { createRequire } from 'module';

/**
 * Enhanced GPIO/Relay controller with multiple fallback methods
 * Supports both onoff library and direct sysfs access
 */
export class EnhancedRelayController {
  constructor(options = {}) {
    this.enabled = !!options.enabled;
    this.pinNumber = options.pinNumber ?? 17; // BCM numbering
    this.activeHigh = options.activeHigh ?? true; // active-low relays set false
    this.hz = Number(options.hz ?? 2); // blink frequency when done
    this.defaultDurationMs = Number(options.defaultDurationMs ?? 10000); // ms to blink after done
    this.useSysfs = options.useSysfs ?? false; // Force sysfs mode
    
    // Internal state
    this.Gpio = null;
    this.pin = null;
    this.currentOn = false;
    this.blinkInterval = null;
    this.stopTimeout = null;
    this.actualPinNumber = null; // The real GPIO pin number for sysfs
    this.mode = null; // 'onoff' or 'sysfs'
  }

  // Try to load the onoff library
  tryLoadOnOff() {
    if (!this.enabled || this.useSysfs) return false;
    try {
      const require = createRequire(import.meta.url);
      const mod = require('onoff');
      this.Gpio = mod.Gpio || (mod.default && mod.default.Gpio) || null;
      if (!this.Gpio) throw new Error('onoff.Gpio not found');
      return true;
    } catch (e) {
      console.warn('[GPIO] Failed to load onoff library:', e?.message || e);
      return false;
    }
  }

  // Calculate the actual GPIO pin number from BCM pin number
  calculateActualPinNumber(bcmPin) {
    try {
      const chips = fs.readdirSync('/sys/class/gpio').filter(name => name.startsWith('gpiochip'));
      
      for (const chip of chips) {
        const chipPath = `/sys/class/gpio/${chip}`;
        try {
          const base = parseInt(fs.readFileSync(`${chipPath}/base`, 'utf-8').trim());
          const ngpio = parseInt(fs.readFileSync(`${chipPath}/ngpio`, 'utf-8').trim());
          
          // For the main GPIO chip (usually has more pins)
          if (ngpio > 20) {
            const actualPin = base + bcmPin;
            console.log(`[GPIO] BCM pin ${bcmPin} maps to GPIO pin ${actualPin} (chip base: ${base})`);
            return actualPin;
          }
        } catch (e) {
          // Skip this chip if we can't read it
        }
      }
    } catch (e) {
      console.warn('[GPIO] Failed to calculate actual pin number:', e.message);
    }
    
    // Fallback: assume BCM numbering matches GPIO numbering
    return bcmPin;
  }

  // Initialize using sysfs
  async initSysfs() {
    try {
      this.actualPinNumber = this.calculateActualPinNumber(this.pinNumber);
      
      console.log(`[GPIO] Attempting to initialize GPIO pin ${this.actualPinNumber} (BCM ${this.pinNumber}) via sysfs`);
      
      // Export the pin
      fs.writeFileSync('/sys/class/gpio/export', String(this.actualPinNumber));
      
      // Wait for the pin to be available
      const pinPath = `/sys/class/gpio/gpio${this.actualPinNumber}`;
      let retries = 10;
      while (retries > 0 && !fs.existsSync(pinPath)) {
        await new Promise(resolve => setTimeout(resolve, 10));
        retries--;
      }
      
      if (!fs.existsSync(pinPath)) {
        throw new Error(`Pin directory ${pinPath} not available after export`);
      }
      
      // Set direction to output
      fs.writeFileSync(`${pinPath}/direction`, 'out');
      
      // Set initial state
      this.setSysfsRelay(false);
      
      this.mode = 'sysfs';
      console.log(`[GPIO] Pin ${this.actualPinNumber} initialized successfully via sysfs`);
      return true;
    } catch (e) {
      console.warn('[GPIO] Failed to initialize via sysfs:', e.message);
      
      // Try to clean up on failure
      try {
        fs.writeFileSync('/sys/class/gpio/unexport', String(this.actualPinNumber));
      } catch {}
      
      return false;
    }
  }

  // Initialize using onoff library
  initOnOff() {
    try {
      console.log(`[GPIO] Attempting to initialize BCM pin ${this.pinNumber} via onoff library`);
      this.pin = new this.Gpio(this.pinNumber, 'out');
      this.setOnOffRelay(false);
      this.mode = 'onoff';
      console.log(`[GPIO] Pin ${this.pinNumber} initialized successfully via onoff`);
      return true;
    } catch (e) {
      console.warn('[GPIO] Failed to initialize via onoff:', e.message);
      return false;
    }
  }

  // Main initialization method
  async init() {
    if (!this.enabled) return;

    // Set up cleanup handlers
    const cleanup = () => {
      try { this.dispose(); } catch {}
    };
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('exit', cleanup);

    // Try onoff first (unless forced to use sysfs)
    if (!this.useSysfs && this.tryLoadOnOff()) {
      if (this.initOnOff()) {
        console.log(`[GPIO] Relay ready on BCM pin ${this.pinNumber} via onoff (activeHigh=${this.activeHigh})`);
        return;
      }
    }

    // Fallback to sysfs
    console.log('[GPIO] Falling back to sysfs method...');
    if (await this.initSysfs()) {
      console.log(`[GPIO] Relay ready on GPIO pin ${this.actualPinNumber} via sysfs (activeHigh=${this.activeHigh})`);
      return;
    }

    // Both methods failed
    console.warn('[GPIO] All GPIO initialization methods failed');
    console.warn('[GPIO] This may be due to:');
    console.warn('[GPIO]   - Pin already in use');
    console.warn('[GPIO]   - Running on non-Raspberry Pi hardware');
    console.warn('[GPIO]   - Insufficient permissions');
    console.warn('[GPIO]   - Hardware issue');
    this.enabled = false;
  }

  // Set relay state using onoff
  setOnOffRelay(on) {
    if (!this.pin) return;
    const level = this.activeHigh ? (on ? 1 : 0) : (on ? 0 : 1);
    try {
      this.pin.writeSync(level);
    } catch (e) {
      console.warn('[GPIO] onoff writeSync failed:', e.message);
    }
  }

  // Set relay state using sysfs
  setSysfsRelay(on) {
    if (!this.actualPinNumber) return;
    const level = this.activeHigh ? (on ? '1' : '0') : (on ? '0' : '1');
    try {
      const pinPath = `/sys/class/gpio/gpio${this.actualPinNumber}/value`;
      fs.writeFileSync(pinPath, level);
    } catch (e) {
      console.warn('[GPIO] sysfs write failed:', e.message);
    }
  }

  // Set relay state (unified method)
  setRelay(on) {
    this.currentOn = !!on;
    if (!this.enabled) return;

    if (this.mode === 'onoff') {
      this.setOnOffRelay(on);
    } else if (this.mode === 'sysfs') {
      this.setSysfsRelay(on);
    }
  }

  // Start blinking (simplified - just turn on for duration)
  startBlinking(durationMs) {
    if (!this.enabled) return;
    
    const dur = Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs)) : this.defaultDurationMs;
    this.stopBlinking();
    
    // For LEDs with built-in blinking, just turn on and leave it on
    this.setRelay(true);
    
    // Set timeout to turn off after duration (if duration > 0)
    if (dur > 0) {
      this.stopTimeout = setTimeout(() => this.stopBlinking(), dur);
    }
  }

  // Stop blinking
  stopBlinking() {
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
    
    if (this.mode === 'onoff' && this.pin) {
      try {
        this.setOnOffRelay(false);
        this.pin.unexport();
        console.log(`[GPIO] Pin ${this.pinNumber} unexported via onoff`);
      } catch (e) {
        console.warn(`[GPIO] Failed to unexport pin ${this.pinNumber} via onoff:`, e.message);
      }
      this.pin = null;
    } else if (this.mode === 'sysfs' && this.actualPinNumber) {
      try {
        this.setSysfsRelay(false);
        fs.writeFileSync('/sys/class/gpio/unexport', String(this.actualPinNumber));
        console.log(`[GPIO] Pin ${this.actualPinNumber} unexported via sysfs`);
      } catch (e) {
        console.warn(`[GPIO] Failed to unexport pin ${this.actualPinNumber} via sysfs:`, e.message);
      }
    }
  }

  // Static method to force cleanup a pin
  static forceCleanupPin(pinNumber) {
    try {
      fs.writeFileSync('/sys/class/gpio/unexport', String(pinNumber));
      console.log(`[GPIO] Force unexported pin ${pinNumber} via sysfs`);
    } catch (e) {
      console.warn(`[GPIO] Failed to force cleanup pin ${pinNumber}:`, e.message);
    }
  }
}
