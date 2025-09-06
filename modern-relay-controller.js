import { createRequire } from 'module';

/**
 * Modern GPIO/Relay controller using node-libgpiod
 * Works with Raspberry Pi 4 and 5
 */
export class ModernRelayController {
  constructor(options = {}) {
    this.enabled = !!options.enabled;
    this.pinNumber = options.pinNumber ?? 17; // BCM numbering
    this.activeHigh = options.activeHigh ?? true; // active-low relays set false
    this.hz = Number(options.hz ?? 2); // blink frequency when done
    this.defaultDurationMs = Number(options.defaultDurationMs ?? 10000); // ms to blink after done
    
    // Internal state
    this.Chip = null;
    this.Line = null;
    this.chip = null;
    this.line = null;
    this.currentOn = false;
    this.blinkInterval = null;
    this.stopTimeout = null;
    this.chipNumber = 0; // Default to chip 0 for Pi 4, will auto-detect
  }

  // Try to load the node-libgpiod library
  tryLoadLibgpiod() {
    if (!this.enabled) return false;
    try {
      const require = createRequire(import.meta.url);
      const mod = require('node-libgpiod');
      this.Chip = mod.Chip;
      this.Line = mod.Line;
      if (!this.Chip || !this.Line) {
        throw new Error('node-libgpiod Chip or Line not found');
      }
      return true;
    } catch (e) {
      console.warn('[GPIO] Failed to load node-libgpiod:', e?.message || e);
      console.warn('[GPIO] Install with: sudo apt install gpiod libgpiod-dev && npm install node-libgpiod');
      return false;
    }
  }

  // Auto-detect the correct GPIO chip
  detectGpioChip() {
    // For Pi 4, usually chip 0
    // For Pi 5, usually chip 4
    // Try both
    const chipsToTry = [0, 4];
    
    for (const chipNum of chipsToTry) {
      try {
        const testChip = new this.Chip(chipNum);
        console.log(`[GPIO] Found working GPIO chip: ${chipNum}`);
        return chipNum;
      } catch (e) {
        console.log(`[GPIO] Chip ${chipNum} not available:`, e.message);
      }
    }
    
    // Default to 0 if nothing works
    console.warn('[GPIO] No GPIO chip detected, defaulting to chip 0');
    return 0;
  }

  // Initialize the GPIO
  async init() {
    if (!this.enabled) return;

    if (!this.tryLoadLibgpiod()) {
      console.warn('[GPIO] node-libgpiod not available, GPIO disabled');
      this.enabled = false;
      return;
    }

    try {
      // Auto-detect the GPIO chip
      this.chipNumber = this.detectGpioChip();
      
      console.log(`[GPIO] Attempting to initialize pin ${this.pinNumber} on chip ${this.chipNumber}`);
      
      // Create chip and line instances
      this.chip = new this.Chip(this.chipNumber);
      this.line = new this.Line(this.chip, this.pinNumber, this.Line.DIRECTION_OUTPUT);
      
      // Set initial state
      this.setRelay(false);
      
      // Set up cleanup handlers
      const cleanup = () => {
        try { this.dispose(); } catch {}
      };
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);
      process.once('exit', cleanup);
      
      console.log(`[GPIO] Pin ${this.pinNumber} initialized successfully on chip ${this.chipNumber} (activeHigh=${this.activeHigh})`);
    } catch (e) {
      console.warn('[GPIO] Failed to initialize pin:', e?.message || e);
      console.warn('[GPIO] This may be due to:');
      console.warn('[GPIO]   - Pin already in use');
      console.warn('[GPIO]   - Insufficient permissions');
      console.warn('[GPIO]   - Wrong chip number');
      console.warn('[GPIO]   - Hardware issue');
      this.enabled = false;
    }
  }

  // Set relay state
  setRelay(on) {
    this.currentOn = !!on;
    if (!this.enabled || !this.line) return;

    try {
      const value = this.activeHigh ? (on ? 1 : 0) : (on ? 0 : 1);
      this.line.setValue(value);
    } catch (e) {
      console.warn('[GPIO] Failed to set pin value:', e?.message || e);
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
    
    if (this.line) {
      try {
        this.setRelay(false);
        this.line.release();
        console.log(`[GPIO] Pin ${this.pinNumber} released`);
      } catch (e) {
        console.warn(`[GPIO] Failed to release pin ${this.pinNumber}:`, e?.message || e);
      }
      this.line = null;
    }
    
    if (this.chip) {
      try {
        this.chip.close();
        console.log(`[GPIO] Chip ${this.chipNumber} closed`);
      } catch (e) {
        console.warn(`[GPIO] Failed to close chip ${this.chipNumber}:`, e?.message || e);
      }
      this.chip = null;
    }
  }
}
