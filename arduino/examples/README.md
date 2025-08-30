# Tournament Countdown Controller - Example Configuration

This directory contains example configuration files to help you get started quickly.

## Quick Setup Guide

1. **Copy the example configuration:**
   ```bash
   cp examples/config_example.h config.h
   ```

2. **Edit the configuration file:**
   - Update WiFi credentials
   - Set your server IP address
   - Adjust pin assignments if needed

3. **Upload to your ESP32:**
   - Open `tournament_controller.ino` in Arduino IDE
   - Select your ESP32 board and port
   - Click Upload

## Configuration Examples

### Home Network Setup
```cpp
#define WIFI_SSID "MyHomeWiFi"
#define WIFI_PASSWORD "mypassword123"
#define SERVER_HOST "192.168.1.100"
#define SERVER_URL "http://192.168.1.100:3000"
```

### Office/Tournament Network Setup
```cpp
#define WIFI_SSID "TournamentWiFi"
#define WIFI_PASSWORD "tournament2024"
#define SERVER_HOST "10.0.1.50"
#define SERVER_URL "http://10.0.1.50:3000"
```

### Custom Pin Assignment
```cpp
// If using different GPIO pins
#define START_BUTTON_PIN 14
#define RESET_BUTTON_PIN 12
#define STATUS_LED_PIN 13
#define READY_LED_PIN 15
```

### Custom Timer Duration
```cpp
// For 60-second timer instead of 45-second default
#define DEFAULT_TIMER_DURATION_MS 60000
```