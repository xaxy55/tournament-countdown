#!/usr/bin/env node

/**
 * Test script for the modern GPIO library (node-libgpiod)
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

console.log('=== Modern GPIO Test (node-libgpiod) ===');
console.log(`Running as user: ${process.getuid()} (0 = root)`);

async function testModernGpio() {
  try {
    // Try to load the library
    console.log('\n--- Loading node-libgpiod ---');
    const { Chip, Line } = require('node-libgpiod');
    console.log('✓ node-libgpiod loaded successfully');

    // Detect available chips
    console.log('\n--- Detecting GPIO Chips ---');
    const chipsToTry = [0, 1, 2, 3, 4];
    const availableChips = [];

    for (const chipNum of chipsToTry) {
      try {
        const chip = new Chip(chipNum);
        console.log(`✓ Chip ${chipNum} is available`);
        availableChips.push(chipNum);
        chip.close();
      } catch (e) {
        console.log(`✗ Chip ${chipNum} not available: ${e.message}`);
      }
    }

    if (availableChips.length === 0) {
      throw new Error('No GPIO chips available');
    }

    // Test GPIO pins on the first available chip
    const testChip = availableChips[0];
    console.log(`\n--- Testing GPIO Pins on Chip ${testChip} ---`);
    
    const pinsToTest = [17, 18, 22, 23, 24, 25];
    const workingPins = [];

    for (const pin of pinsToTest) {
      try {
        console.log(`Testing pin ${pin}...`);
        
        const chip = new Chip(testChip);
        const line = new Line(chip, pin, Line.DIRECTION_OUTPUT);
        
        // Test setting pin high and low
        line.setValue(1);
        console.log(`  ✓ Set pin ${pin} to HIGH`);
        
        line.setValue(0);
        console.log(`  ✓ Set pin ${pin} to LOW`);
        
        // Clean up
        line.release();
        chip.close();
        
        workingPins.push(pin);
        console.log(`  ✓ Pin ${pin} works perfectly!`);
        
      } catch (e) {
        console.log(`  ✗ Pin ${pin} failed: ${e.message}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Results
    console.log('\n--- Results ---');
    console.log(`Available GPIO chips: ${availableChips.join(', ')}`);
    
    if (workingPins.length > 0) {
      console.log(`✓ Working GPIO pins on chip ${testChip}: ${workingPins.join(', ')}`);
      console.log('\nYou can use any of these configurations:');
      for (const pin of workingPins) {
        console.log(`  Chip ${testChip}, Pin ${pin}: export GPIO_CHIP=${testChip} RELAY_PIN=${pin}`);
      }
    } else {
      console.log('✗ No working GPIO pins found');
    }

  } catch (e) {
    console.error('\n❌ Test failed:', e.message);
    
    if (e.message.includes('Cannot find module')) {
      console.log('\n📦 To install node-libgpiod:');
      console.log('  sudo apt update');
      console.log('  sudo apt install gpiod libgpiod-dev libgpiod-doc libnode-dev');
      console.log('  npm install node-libgpiod');
    }
    
    if (e.message.includes('Permission denied')) {
      console.log('\n🔒 Permission issue - try running as root:');
      console.log('  sudo node scripts/test-modern-gpio.js');
    }
  }
}

// Run the test
testModernGpio().catch(console.error);
