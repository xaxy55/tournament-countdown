/*
 * Example configuration file for Tournament Countdown Controller
 * 
 * Copy this file to ../config.h and update the values below
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// WIFI CONFIGURATION - UPDATE THESE VALUES
// ============================================================================
#define WIFI_SSID "YOUR_WIFI_SSID"           // Replace with your WiFi network name
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"   // Replace with your WiFi password
#define WIFI_TIMEOUT_SECONDS 20

// ============================================================================
// SERVER CONFIGURATION - UPDATE THESE VALUES
// ============================================================================
#define SERVER_HOST "192.168.1.100"          // Replace with your server's IP address
#define SERVER_PORT 3000
#define SERVER_URL "http://192.168.1.100:3000"  // Replace with your server's full URL

// ============================================================================
// HARDWARE PIN CONFIGURATION
// ============================================================================
// Standard ESP32 DevKit pin assignments
#define START_BUTTON_PIN 2      // Start button input pin
#define RESET_BUTTON_PIN 4      // Reset button input pin  
#define STATUS_LED_PIN 5        // Status LED output pin (Green - shows timer running/done)
#define READY_LED_PIN 18        // Ready LED output pin (Blue - shows idle/ready state)

// Alternative pin assignments (uncomment to use)
// #define START_BUTTON_PIN 14
// #define RESET_BUTTON_PIN 12
// #define STATUS_LED_PIN 13
// #define READY_LED_PIN 15

// ============================================================================
// TIMER CONFIGURATION
// ============================================================================
#define DEFAULT_TIMER_DURATION_MS 45000      // 45 seconds (45000ms)
// #define DEFAULT_TIMER_DURATION_MS 60000   // Alternative: 60 seconds
// #define DEFAULT_TIMER_DURATION_MS 30000   // Alternative: 30 seconds

#define STATUS_CHECK_INTERVAL_MS 2000        // Check server status every 2 seconds

// ============================================================================
// BUTTON CONFIGURATION
// ============================================================================
#define BUTTON_DEBOUNCE_MS 250               // Button debounce delay
#define BUTTON_ACTIVE_HIGH false             // false = use internal pull-ups (recommended)

// ============================================================================
// LED CONFIGURATION
// ============================================================================
#define LED_BLINK_INTERVAL_MS 500            // LED blink speed for "timer done" state
#define LED_ACTIVE_HIGH true                 // true = LED on when GPIO high

// ============================================================================
// WEBSOCKET CONFIGURATION
// ============================================================================
#define WEBSOCKET_RECONNECT_INTERVAL_MS 5000

// ============================================================================
// SERIAL DEBUG CONFIGURATION
// ============================================================================
#define SERIAL_BAUD_RATE 115200
#define DEBUG_ENABLED true                   // Set to false to disable debug output

// Debug macros
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