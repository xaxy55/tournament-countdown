#!/usr/bin/env node

// Direct sysfs GPIO test (fallback when onoff library fails)
import fs from 'fs';
import path from 'path';

console.log('=== Direct sysfs GPIO Test ===');

class SysfsGpio {
  constructor(pin) {
    this.pin = pin;
    this.gpioPath = `/sys/class/gpio/gpio${pin}`;
    this.exportPath = '/sys/class/gpio/export';
    this.unexportPath = '/sys/class/gpio/unexport';
  }

  async export() {
    try {
      // Check if already exported
      if (fs.existsSync(this.gpioPath)) {
        console.log(`Pin ${this.pin}: Already exported`);
        return true;
      }

      // Export the pin
      fs.writeFileSync(this.exportPath, String(this.pin));
      console.log(`Pin ${this.pin}: Exported successfully`);
      
      // Wait a bit for the filesystem to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (e) {
      console.log(`Pin ${this.pin}: Export failed - ${e.message}`);
      return false;
    }
  }

  setDirection(direction = 'out') {
    try {
      const dirPath = path.join(this.gpioPath, 'direction');
      fs.writeFileSync(dirPath, direction);
      console.log(`Pin ${this.pin}: Direction set to '${direction}'`);
      return true;
    } catch (e) {
      console.log(`Pin ${this.pin}: Set direction failed - ${e.message}`);
      return false;
    }
  }

  setValue(value) {
    try {
      const valuePath = path.join(this.gpioPath, 'value');
      fs.writeFileSync(valuePath, String(value ? 1 : 0));
      console.log(`Pin ${this.pin}: Value set to ${value ? 1 : 0}`);
      return true;
    } catch (e) {
      console.log(`Pin ${this.pin}: Set value failed - ${e.message}`);
      return false;
    }
  }

  getValue() {
    try {
      const valuePath = path.join(this.gpioPath, 'value');
      const value = fs.readFileSync(valuePath, 'utf8').trim();
      console.log(`Pin ${this.pin}: Current value is ${value}`);
      return parseInt(value);
    } catch (e) {
      console.log(`Pin ${this.pin}: Get value failed - ${e.message}`);
      return null;
    }
  }

  unexport() {
    try {
      if (fs.existsSync(this.gpioPath)) {
        fs.writeFileSync(this.unexportPath, String(this.pin));
        console.log(`Pin ${this.pin}: Unexported successfully`);
      }
      return true;
    } catch (e) {
      console.log(`Pin ${this.pin}: Unexport failed - ${e.message}`);
      return false;
    }
  }
}

async function testPin(pinNumber) {
  console.log(`\n--- Testing Pin ${pinNumber} ---`);
  
  const gpio = new SysfsGpio(pinNumber);
  
  // Test sequence
  if (await gpio.export()) {
    if (gpio.setDirection('out')) {
      if (gpio.setValue(0)) {
        gpio.getValue();
        if (gpio.setValue(1)) {
          gpio.getValue();
          gpio.setValue(0); // Turn off
        }
      }
    }
    gpio.unexport();
  }
}

async function main() {
  console.log(`Running as user: ${process.getuid()} (0 = root)`);
  
  // Check basic GPIO access
  console.log('\n--- Checking GPIO sysfs access ---');
  try {
    fs.accessSync('/sys/class/gpio', fs.constants.R_OK | fs.constants.W_OK);
    console.log('/sys/class/gpio: Read/Write access OK');
  } catch (e) {
    console.log('/sys/class/gpio: Access DENIED - need root?');
    process.exit(1);
  }

  // Test the pins
  const testPins = [17, 18, 22, 23, 24, 25];
  
  for (const pin of testPins) {
    await testPin(pin);
  }
  
  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
