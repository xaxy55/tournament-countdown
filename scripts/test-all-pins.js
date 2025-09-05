#!/usr/bin/env node

// Simple GPIO pin tester - tests multiple pins to find working ones

const testPins = [17, 18, 22, 23, 24, 25];

console.log('🔍 Testing Multiple GPIO Pins');
console.log('=============================');
console.log('');

async function testPin(pinNumber) {
  try {
    const { Gpio } = await import('onoff');
    console.log(`Testing pin ${pinNumber}...`);
    
    try {
      const gpio = new Gpio(pinNumber, 'out');
      console.log(`  ✅ Pin ${pinNumber}: Initialization successful`);
      
      // Test write operations
      try {
        gpio.writeSync(0);
        console.log(`  ✅ Pin ${pinNumber}: Write LOW successful`);
        
        gpio.writeSync(1);
        console.log(`  ✅ Pin ${pinNumber}: Write HIGH successful`);
        
        gpio.writeSync(0);
        console.log(`  ✅ Pin ${pinNumber}: Write LOW successful`);
        
        // Cleanup
        gpio.unexport();
        console.log(`  ✅ Pin ${pinNumber}: Cleanup successful`);
        console.log(`  🎉 Pin ${pinNumber}: FULLY WORKING!`);
        return true;
        
      } catch (writeErr) {
        console.log(`  ❌ Pin ${pinNumber}: Write failed - ${writeErr.message}`);
        try { gpio.unexport(); } catch {}
        return false;
      }
      
    } catch (initErr) {
      console.log(`  ❌ Pin ${pinNumber}: Init failed - ${initErr.message}`);
      return false;
    }
    
  } catch (moduleErr) {
    console.log(`  ❌ Pin ${pinNumber}: Module error - ${moduleErr.message}`);
    return false;
  }
}

console.log('Testing common GPIO pins...');
console.log('');

for (const pin of testPins) {
  await testPin(pin);
  console.log('');
}

console.log('💡 Use any working pin with your application:');
console.log('   RELAY_PIN=<working_pin> GPIO_ENABLED=1 npm run start');
