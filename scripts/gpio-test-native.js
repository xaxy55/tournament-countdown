#!/usr/bin/env node

// GPIO Test Script for Native Raspberry Pi
console.log('🔧 GPIO Test for Native Raspberry Pi Installation');
console.log('===============================================');
console.log('');

// Check basic system info
console.log('📋 System Information:');
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Architecture: ${process.arch}`);
console.log(`User: ${process.env.USER}`);
console.log(`Working directory: ${process.cwd()}`);
console.log('');

// Check environment variables
console.log('🌍 Environment Variables:');
const gpioVars = ['GPIO_ENABLED', 'RELAY_PIN', 'RELAY_ACTIVE_HIGH', 'BLINK_HZ', 'BLINK_DURATION_MS'];
gpioVars.forEach(varName => {
  console.log(`${varName}: ${process.env[varName] || 'NOT SET'}`);
});
console.log('');

// Check file system access
console.log('📁 File System Access:');
import fs from 'fs';

const paths = [
  '/dev/gpiomem',
  '/dev/mem', 
  '/sys/class/gpio',
  '/sys/class/gpio/export',
  '/sys/class/gpio/unexport'
];

for (const path of paths) {
  try {
    const stats = fs.statSync(path);
    console.log(`✅ ${path}: exists (${stats.isDirectory() ? 'directory' : 'file'})`);
    
    // Check permissions
    try {
      fs.accessSync(path, fs.constants.R_OK);
      console.log(`   - Read: ✅`);
    } catch {
      console.log(`   - Read: ❌`);
    }
    
    if (!stats.isDirectory()) {
      try {
        fs.accessSync(path, fs.constants.W_OK);
        console.log(`   - Write: ✅`);
      } catch {
        console.log(`   - Write: ❌`);
      }
    }
  } catch (e) {
    console.log(`❌ ${path}: ${e.message}`);
  }
}
console.log('');

// Try to load onoff
console.log('📦 Module Loading:');
try {
  const { Gpio } = await import('onoff');
  console.log('✅ onoff module loaded successfully');
  
  // Try to create a GPIO instance
  const testPin = process.env.RELAY_PIN || 17;
  console.log(`🔌 Testing GPIO pin ${testPin}...`);
  
  try {
    const gpio = new Gpio(testPin, 'out');
    console.log(`✅ GPIO pin ${testPin} initialized successfully`);
    
    // Test write operations
    try {
      gpio.writeSync(0);
      console.log(`✅ Write LOW successful`);
      
      gpio.writeSync(1);
      console.log(`✅ Write HIGH successful`);
      
      gpio.writeSync(0);
      console.log(`✅ Write LOW successful`);
      
      // Cleanup
      gpio.unexport();
      console.log(`✅ GPIO pin ${testPin} cleanup successful`);
      
    } catch (e) {
      console.log(`❌ GPIO write failed: ${e.message}`);
      try { gpio.unexport(); } catch {}
    }
    
  } catch (e) {
    console.log(`❌ GPIO pin ${testPin} initialization failed: ${e.message}`);
    
    // Provide specific error guidance
    if (e.message.includes('EACCES')) {
      console.log('   💡 Permission denied - try running as root or add user to gpio group');
    } else if (e.message.includes('EBUSY')) {
      console.log('   💡 Pin is busy - try releasing it first:');
      console.log(`      pinctrl set ${testPin} ip`);
    } else if (e.message.includes('ENOENT')) {
      console.log('   💡 GPIO not available - check if running on Raspberry Pi');
    }
  }
  
} catch (e) {
  console.log(`❌ Failed to load onoff module: ${e.message}`);
  
  if (e.message.includes('Cannot find module')) {
    console.log('   💡 Install with: npm install onoff');
  }
}

console.log('');
console.log('🎯 Next Steps:');
console.log('1. Ensure user is in gpio group: sudo usermod -a -G gpio tv');
console.log('2. Log out and back in to refresh groups');
console.log('3. Install onoff if missing: npm install onoff');
console.log('4. Release pin if busy: pinctrl set 17 ip');
console.log('5. Try running as root if permission issues persist');
