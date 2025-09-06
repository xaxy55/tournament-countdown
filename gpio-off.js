#!/usr/bin/env node

// Simple script to turn off GPIO pin 529
const { Gpio } = require('onoff');

try {
  console.log('Turning off GPIO pin 529...');
  const pin = new Gpio(529, 'out');
  pin.writeSync(0); // Turn off (LOW)
  pin.unexport();
  console.log('GPIO pin 529 turned OFF');
} catch (error) {
  console.error('Error:', error.message);
}
