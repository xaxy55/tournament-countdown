#!/usr/bin/env node

// Simple GPIO diagnostic script
import { createRequire } from 'module';
import fs from 'fs';

console.log('=== GPIO Diagnostic Test ===');

// Check if we're running as root
console.log(`Running as user: ${process.getuid()} (0 = root)`);

// Check if GPIO device files exist
const gpioDevices = ['/dev/gpiomem', '/dev/mem'];
for (const device of gpioDevices) {
  try {
    const stats = fs.statSync(device);
    console.log(`${device}: exists (mode: ${stats.mode.toString(8)})`);
  } catch (e) {
    console.log(`${device}: NOT FOUND`);
  }
}

// Check if we can access GPIO files
try {
  const gpioBasePath = '/sys/class/gpio';
  if (fs.existsSync(gpioBasePath)) {
    console.log(`${gpioBasePath}: exists`);
    try {
      const files = fs.readdirSync(gpioBasePath);
      console.log(`GPIO sysfs files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
    } catch (e) {
      console.log(`Cannot read ${gpioBasePath}: ${e.message}`);
    }
  } else {
    console.log(`${gpioBasePath}: NOT FOUND`);
  }
} catch (e) {
  console.log(`GPIO sysfs check failed: ${e.message}`);
}

// Try to load onoff module
try {
  const require = createRequire(import.meta.url);
  const { Gpio } = require('onoff');
  console.log('onoff module: LOADED successfully');
  
  // Try to initialize a GPIO pin (use pin 17 by default)
  const testPin = process.env.RELAY_PIN || 17;
  try {
    console.log(`Testing GPIO pin ${testPin}...`);
    const gpio = new Gpio(testPin, 'out');
    console.log(`GPIO pin ${testPin}: INITIALIZED successfully`);
    
    // Test writing to the pin
    gpio.writeSync(0);
    console.log(`GPIO pin ${testPin}: WRITE test successful`);
    
    // Cleanup
    gpio.unexport();
    console.log(`GPIO pin ${testPin}: CLEANUP successful`);
    
  } catch (e) {
    console.log(`GPIO pin ${testPin}: FAILED - ${e.message}`);
    console.log('Error details:', e);
  }
  
} catch (e) {
  console.log(`onoff module: FAILED to load - ${e.message}`);
}

console.log('=== End GPIO Diagnostic ===');
