#!/usr/bin/env node

/**
 * GPIO Chip Discovery Test
 * This script helps find the correct GPIO chip and pin mapping
 */

import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('=== GPIO Chip Discovery Test ===');
console.log(`Running as user: ${process.getuid()} (0 = root)`);

// Check available GPIO chips
console.log('\n--- Available GPIO Chips ---');
try {
  const chips = fs.readdirSync('/sys/class/gpio').filter(name => name.startsWith('gpiochip'));
  for (const chip of chips) {
    const chipPath = `/sys/class/gpio/${chip}`;
    try {
      const base = fs.readFileSync(`${chipPath}/base`, 'utf-8').trim();
      const ngpio = fs.readFileSync(`${chipPath}/ngpio`, 'utf-8').trim();
      const label = fs.readFileSync(`${chipPath}/label`, 'utf-8').trim();
      console.log(`${chip}: base=${base}, ngpio=${ngpio}, label="${label}"`);
    } catch (e) {
      console.log(`${chip}: unable to read details`);
    }
  }
} catch (e) {
  console.error('Failed to read GPIO chips:', e.message);
}

// Function to test direct sysfs GPIO access
async function testSysfsGpio(pin) {
  console.log(`\n--- Testing sysfs GPIO pin ${pin} ---`);
  
  try {
    // Export the pin
    fs.writeFileSync('/sys/class/gpio/export', String(pin));
    console.log(`✓ Exported pin ${pin}`);
    
    // Wait a moment for the pin to be available
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check if pin directory exists
    const pinPath = `/sys/class/gpio/gpio${pin}`;
    if (!fs.existsSync(pinPath)) {
      throw new Error(`Pin directory ${pinPath} does not exist`);
    }
    
    // Set direction to output
    fs.writeFileSync(`${pinPath}/direction`, 'out');
    console.log(`✓ Set pin ${pin} direction to output`);
    
    // Test writing values
    fs.writeFileSync(`${pinPath}/value`, '1');
    console.log(`✓ Set pin ${pin} value to 1`);
    
    fs.writeFileSync(`${pinPath}/value`, '0');
    console.log(`✓ Set pin ${pin} value to 0`);
    
    // Clean up
    fs.writeFileSync('/sys/class/gpio/unexport', String(pin));
    console.log(`✓ Unexported pin ${pin}`);
    
    return true;
  } catch (e) {
    console.error(`✗ Pin ${pin} failed:`, e.message);
    
    // Try to clean up on error
    try {
      fs.writeFileSync('/sys/class/gpio/unexport', String(pin));
    } catch {}
    
    return false;
  }
}

// Function to calculate actual GPIO pin numbers
function calculateGpioPins() {
  console.log('\n--- Calculating GPIO Pin Numbers ---');
  
  // For Raspberry Pi, BCM pin 17 could map to different GPIO numbers
  // depending on the GPIO chip base
  try {
    const chips = fs.readdirSync('/sys/class/gpio').filter(name => name.startsWith('gpiochip'));
    
    for (const chip of chips) {
      const chipPath = `/sys/class/gpio/${chip}`;
      try {
        const base = parseInt(fs.readFileSync(`${chipPath}/base`, 'utf-8').trim());
        const ngpio = parseInt(fs.readFileSync(`${chipPath}/ngpio`, 'utf-8').trim());
        const label = fs.readFileSync(`${chipPath}/label`, 'utf-8').trim();
        
        console.log(`\n${chip} (${label}):`);
        console.log(`  Base: ${base}, Count: ${ngpio}`);
        console.log(`  Pin range: ${base} to ${base + ngpio - 1}`);
        
        // For the main GPIO chip (usually the one with more pins)
        if (ngpio > 20) {
          console.log(`  BCM pin 17 would be GPIO pin: ${base + 17}`);
          console.log(`  BCM pin 18 would be GPIO pin: ${base + 18}`);
          console.log(`  BCM pin 22 would be GPIO pin: ${base + 22}`);
          console.log(`  BCM pin 23 would be GPIO pin: ${base + 23}`);
        }
      } catch (e) {
        console.log(`  Unable to read ${chip} details`);
      }
    }
  } catch (e) {
    console.error('Failed to calculate GPIO pins:', e.message);
  }
}

// Main test function
async function main() {
  calculateGpioPins();
  
  console.log('\n--- Testing Common GPIO Pin Numbers ---');
  
  // Test common GPIO pin numbers
  const testPins = [
    17, 18, 22, 23, 24, 25,  // BCM numbers
    512, 513, 514, 515, 516, 517, 518, // chip512 + BCM offset
    529, 530, 534, 535, 536, 537, 538, // chip512 + BCM offset for other pins
    587, 588, 589, 590 // chip570 + offset
  ];
  
  const workingPins = [];
  
  for (const pin of testPins) {
    const success = await testSysfsGpio(pin);
    if (success) {
      workingPins.push(pin);
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n--- Results ---');
  if (workingPins.length > 0) {
    console.log('✓ Working GPIO pins:', workingPins.join(', '));
    console.log('\nYou can use any of these pins in your application by setting:');
    console.log(`export RELAY_PIN=${workingPins[0]}`);
  } else {
    console.log('✗ No working GPIO pins found');
    console.log('This may indicate a hardware or permissions issue');
  }
}

// Run the test
main().catch(console.error);
