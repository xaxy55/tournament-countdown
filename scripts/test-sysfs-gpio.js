#!/usr/bin/env node

// Test GPIO using sysfs method (older, more compatible)

import fs from 'fs';

console.log('🔧 Testing GPIO via sysfs (legacy method)');
console.log('==========================================');
console.log('');

function testSysfsGpio(pin) {
  console.log(`Testing pin ${pin} via sysfs...`);
  
  try {
    // Export the pin
    fs.writeFileSync('/sys/class/gpio/export', String(pin));
    console.log(`  ✅ Pin ${pin} exported`);
    
    // Wait a moment for the pin to be available
    setTimeout(() => {
      try {
        // Set direction to output
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/direction`, 'out');
        console.log(`  ✅ Pin ${pin} set to output`);
        
        // Test writing values
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/value`, '0');
        console.log(`  ✅ Pin ${pin} set to LOW`);
        
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/value`, '1');
        console.log(`  ✅ Pin ${pin} set to HIGH`);
        
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/value`, '0');
        console.log(`  ✅ Pin ${pin} set to LOW`);
        
        // Read back the value
        const value = fs.readFileSync(`/sys/class/gpio/gpio${pin}/value`, 'utf8').trim();
        console.log(`  ✅ Pin ${pin} value: ${value}`);
        
        // Cleanup
        fs.writeFileSync('/sys/class/gpio/unexport', String(pin));
        console.log(`  ✅ Pin ${pin} unexported`);
        console.log(`  🎉 Pin ${pin} SYSFS METHOD WORKS!`);
        return true;
        
      } catch (e) {
        console.log(`  ❌ Pin ${pin} sysfs operation failed: ${e.message}`);
        try {
          fs.writeFileSync('/sys/class/gpio/unexport', String(pin));
        } catch {}
        return false;
      }
    }, 100);
    
  } catch (e) {
    console.log(`  ❌ Pin ${pin} export failed: ${e.message}`);
    
    if (e.message.includes('EBUSY')) {
      console.log(`    💡 Pin ${pin} is already exported, trying to use it...`);
      // Try to use existing export
      try {
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/direction`, 'out');
        fs.writeFileSync(`/sys/class/gpio/gpio${pin}/value`, '0');
        console.log(`  ✅ Pin ${pin} works with existing export`);
        return true;
      } catch (useErr) {
        console.log(`    ❌ Cannot use existing export: ${useErr.message}`);
        return false;
      }
    }
    return false;
  }
}

// Test a few pins with sysfs
const testPins = [18, 22, 23, 24];
console.log('Testing pins via sysfs method...');
console.log('');

for (const pin of testPins) {
  testSysfsGpio(pin);
  console.log('');
}

console.log('💡 If sysfs works, the issue is with the onoff library/libgpiod');
console.log('💡 If sysfs fails, there\'s a system-level GPIO problem');
