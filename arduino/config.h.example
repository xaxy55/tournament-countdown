/*
 * Configuration file for Tournament Countdown Controller
 * 
 * Update these values to match your setup before uploading to ESP32
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// WIFI CONFIGURATION
// ============================================================================
// Update these with your WiFi network credentials
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// WiFi connection timeout (seconds)
#define WIFI_TIMEOUT_SECONDS 20

// ============================================================================
// SERVER CONFIGURATION  
// ============================================================================
// Update these with your tournament countdown server details
#define SERVER_HOST "192.168.1.100"    // IP address of your server
#define SERVER_PORT 3000               // Port number (usually 3000)
#define SERVER_URL "http://192.168.1.100:3000"  // Full URL to your server

// ============================================================================
// HARDWARE PIN CONFIGURATION
// ============================================================================
// GPIO pin assignments - modify if using different pins
#define START_BUTTON_PIN 2      // Start button input pin
#define RESET_BUTTON_PIN 4      // Reset button input pin  
#define STATUS_LED_PIN 5        // Status LED output pin (shows timer running/done)
#define READY_LED_PIN 18        // Ready LED output pin (shows idle/ready state)

// ============================================================================
// TIMER CONFIGURATION
// ============================================================================
// Default timer duration in milliseconds (45 seconds = 45000ms)
#define DEFAULT_TIMER_DURATION_MS 45000

// Status check interval when WebSocket is disconnected (milliseconds)
#define STATUS_CHECK_INTERVAL_MS 2000

// ============================================================================
// BUTTON CONFIGURATION
// ============================================================================
// Button debounce delay in milliseconds
#define BUTTON_DEBOUNCE_MS 250

// Button active state (true = active high, false = active low)
// Set to false if using pull-up resistors (recommended)
#define BUTTON_ACTIVE_HIGH false

// ============================================================================
// LED CONFIGURATION
// ============================================================================
// LED blink interval for "timer done" state (milliseconds)
#define LED_BLINK_INTERVAL_MS 500

// LED active state (true = active high, false = active low)
#define LED_ACTIVE_HIGH true

// ============================================================================
// WEBSOCKET CONFIGURATION
// ============================================================================
// WebSocket reconnection interval (milliseconds)
#define WEBSOCKET_RECONNECT_INTERVAL_MS 5000

// ============================================================================
// SERIAL DEBUG CONFIGURATION
// ============================================================================
// Serial baud rate for debug output
#define SERIAL_BAUD_RATE 115200

// Enable/disable debug output (true = enabled, false = disabled)
#define DEBUG_ENABLED true

// Debug macros - only active when DEBUG_ENABLED is true
#if DEBUG_ENABLED
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_PRINTF(x, ...) Serial.printf(x, __VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(x, ...)
#endif

#endif // CONFIG_H