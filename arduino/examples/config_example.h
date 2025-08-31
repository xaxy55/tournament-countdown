/*
 * Example configuration file for Tournament Countdown Controller
 * 
 * Copy this file to ../tournament_controller/config.h and update the values below
 */

#ifndef CONFIG_H
#define CONFIG_H

// ============================================================================
// WIFI CONFIGURATION - UPDATE THESE VALUES
// ============================================================================
#define WIFI_SSID "YOUR_WIFI_SSID"           // Replace with your WiFi network name
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"   // Replace with your WiFi password
#define WIFI_TIMEOUT_SECONDS 20              // WiFi connection timeout (seconds)

// ============================================================================
// SERVER CONFIGURATION - UPDATE THESE VALUES
// ============================================================================
#define SERVER_HOST "192.168.69.107"          // Replace with your server's IP address
#define SERVER_PORT 3000
#define SERVER_URL "http://192.168.69.107:3000"  // Replace with your server's full URL

// ============================================================================
// HARDWARE PIN CONFIGURATION
// ============================================================================
// ESP8266 NodeMCU pin assignments (recommended setup)
#define START_BUTTON_PIN D2      // Start button input pin (GPIO 4)
#define RESET_BUTTON_PIN D1      // Reset button input pin (GPIO 5)
#define STATUS_LED_PIN D8        // Status LED output pin (GPIO 15 - Green - shows timer running/done)
#define READY_LED_PIN D6         // Ready LED output pin (GPIO 12 - Blue - shows idle/ready state)

// 7-Segment Display pins (TM1637)
#define DISPLAY_CLK_PIN D4       // Clock pin for 7-segment display (GPIO 2)
#define DISPLAY_DIO_PIN D3       // Data pin for 7-segment display (GPIO 0)

// Alternative ESP8266 pin assignments (uncomment to use different pins)
// #define START_BUTTON_PIN D5    // GPIO 14
// #define RESET_BUTTON_PIN D7    // GPIO 13
// #define STATUS_LED_PIN D0      // GPIO 16
// #define READY_LED_PIN D2       // GPIO 4

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