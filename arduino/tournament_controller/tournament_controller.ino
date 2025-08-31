/*
 * Tournament Countdown Controller for ESP32
 * 
 * Hardware:
 * - 2 push buttons (start/reset)
 * - 2 LEDs (status indicators)
 * - ESP32 development board
 * 
 * This controller connects to the tournament countdown server via WiFi
 * and provides physical button control for starting and resetting the timer.
 * 
 * Before uploading:
 * 1. Update config.h with your WiFi credentials and server details
 * 2. Verify pin assignments match your hardware setup
 * 3. Install required libraries: ArduinoJson and WebSockets
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <TM1637Display.h>
#include "config.h"

// Note: ESP8266 version with 7-segment display support

// Button debouncing
unsigned long lastStartPress = 0;
unsigned long lastResetPress = 0;

// Timer state
bool timerRunning = false;
bool timerDone = false;
unsigned long lastStatusCheck = 0;

// WebSocket client for real-time updates
WebSocketsClient webSocket;

// 7-Segment Display
TM1637Display display(DISPLAY_CLK_PIN, DISPLAY_DIO_PIN);

// Timer display variables
int currentTimerSeconds = 0;
int lastDisplayedMs = -1;  // Track last displayed milliseconds to avoid unnecessary updates
int lastKnownRemainingMs = 0;  // Last known timer value from server
unsigned long timerStartTime = 0;  // When the current timer started (for local countdown)
bool localCountdownActive = false;  // Whether we're doing local countdown between server updates
unsigned long lastDisplayUpdate = 0;
unsigned long lastPeriodicCheck = 0;
unsigned long lastDisplayRefresh = 0;

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  
  // Initialize display
  display.setBrightness(0x0f);  // Maximum brightness
  display.showNumberDecEx(0, 0b00100000, true);  // Show "00.0" at startup
  
  // Initialize pins
  pinMode(START_BUTTON_PIN, INPUT_PULLUP);
  pinMode(RESET_BUTTON_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(READY_LED_PIN, OUTPUT);
  
  // Initial LED state - ready LED on, status LED off
  digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
  digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
  
  DEBUG_PRINTLN("Tournament Countdown Controller");
  DEBUG_PRINTLN("Connecting to WiFi...");
  
  connectToWiFi();
  
  // Initialize WebSocket connection
  webSocket.begin(SERVER_HOST, SERVER_PORT, "/socket.io/?EIO=4&transport=websocket");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(WEBSOCKET_RECONNECT_INTERVAL_MS);
  
  DEBUG_PRINTLN("Controller ready!");
  DEBUG_PRINTLN("Press START button to start timer");
  DEBUG_PRINTLN("Press RESET button to reset timer");
}

void loop() {
  webSocket.loop();
  
  // Check button presses
  checkButtons();
  
  // Continuous display update for smooth countdown when timer is running
  if (timerRunning && localCountdownActive) {
    unsigned long elapsed = millis() - timerStartTime;
    int estimatedRemaining = lastKnownRemainingMs - elapsed;
    if (estimatedRemaining > 0) {
      updateDisplay(estimatedRemaining);
    } else {
      updateDisplay(0);
    }
  }
  
  // Periodically check server status if WebSocket is not connected
  if (!webSocket.isConnected() && millis() - lastStatusCheck > STATUS_CHECK_INTERVAL_MS) {
    checkTimerStatus();
    lastStatusCheck = millis();
  }
  
  // Even when WebSocket is connected, periodically verify timer state for display accuracy
  if (webSocket.isConnected() && millis() - lastPeriodicCheck > 1000) {
    checkTimerStatus();
    lastPeriodicCheck = millis();
  }
  
  delay(50);
}

void connectToWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < WIFI_TIMEOUT_SECONDS) {
    delay(500);
    DEBUG_PRINT(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    DEBUG_PRINTLN();
    DEBUG_PRINTLN("WiFi connected!");
    DEBUG_PRINT("IP address: ");
    DEBUG_PRINTLN(WiFi.localIP());
  } else {
    DEBUG_PRINTLN();
    DEBUG_PRINTLN("Failed to connect to WiFi!");
    // Blink both LEDs to indicate error
    for (int i = 0; i < 10; i++) {
      digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
      digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
      delay(200);
      digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
      digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
      delay(200);
    }
  }
}

void checkButtons() {
  // Check START button
  bool startPressed = BUTTON_ACTIVE_HIGH ? digitalRead(START_BUTTON_PIN) : !digitalRead(START_BUTTON_PIN);
  if (startPressed && millis() - lastStartPress > BUTTON_DEBOUNCE_MS) {
    lastStartPress = millis();
    DEBUG_PRINTLN("START button pressed");
    startTimer();
  }
  
  // Check RESET button
  bool resetPressed = BUTTON_ACTIVE_HIGH ? digitalRead(RESET_BUTTON_PIN) : !digitalRead(RESET_BUTTON_PIN);
  if (resetPressed && millis() - lastResetPress > BUTTON_DEBOUNCE_MS) {
    lastResetPress = millis();
    DEBUG_PRINTLN("RESET button pressed");
    resetTimer();
  }
}

void startTimer() {
  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("WiFi not connected!");
    return;
  }
  
  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(SERVER_URL) + "/api/start");
  http.addHeader("Content-Type", "application/json");
  
  // Use configured default duration
  String payload = "{\"durationMs\": " + String(DEFAULT_TIMER_DURATION_MS) + "}";
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    DEBUG_PRINTLN("Timer started successfully");
    DEBUG_PRINTLN("Response: " + response);
    
    // Update LEDs - timer running
    digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
    digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
    timerRunning = true;
    timerDone = false;
  } else {
    DEBUG_PRINTLN("Error starting timer: " + String(httpResponseCode));
  }
  
  http.end();
}

void resetTimer() {
  if (WiFi.status() != WL_CONNECTED) {
    DEBUG_PRINTLN("WiFi not connected!");
    return;
  }
  
  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(SERVER_URL) + "/api/reset");
  http.addHeader("Content-Type", "application/json");
  
  int httpResponseCode = http.POST("{}");
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    DEBUG_PRINTLN("Timer reset successfully");
    DEBUG_PRINTLN("Response: " + response);
    
    // Update LEDs - ready state
    digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
    digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
    timerRunning = false;
    timerDone = false;
  } else {
    DEBUG_PRINTLN("Error resetting timer: " + String(httpResponseCode));
  }
  
  http.end();
}

void checkTimerStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  WiFiClient client;
  HTTPClient http;
  http.begin(client, String(SERVER_URL) + "/api/state");
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    
    // Parse JSON response
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, response);
    
    bool running = doc["running"];
    int remainingMs = doc["remainingMs"];
    
    updateLEDs(running, remainingMs);
  }
  
  http.end();
}

void updateDisplay(int remainingMs) {
  // Only update display at specified refresh rate
  if (millis() - lastDisplayRefresh < DISPLAY_REFRESH_RATE_MS) {
    return;  // Skip update if not enough time has passed
  }
  
  // Ensure we don't show negative values
  if (remainingMs < 0) remainingMs = 0;
  
  // Check if we need to update (avoid unnecessary display writes)
  if (remainingMs == lastDisplayedMs) {
    return;  // No change, skip update
  }
  
  int totalSeconds = remainingMs / 1000;
  int minutes = totalSeconds / 60;
  
  // Decide format based on remaining time
  int displayValue;
  bool useDecimalPoint = false;
  
  if (totalSeconds >= 60) {
    // If 60+ seconds, show MM:SS format
    int seconds = totalSeconds % 60;
    displayValue = minutes * 100 + seconds;
    useDecimalPoint = true;  // Use colon for MM:SS
    DEBUG_PRINTF("Display update: %d ms -> %02d:%02d (MM:SS format, value: %04d)\n", 
                remainingMs, minutes, seconds, displayValue);
  } else {
    // If less than 60 seconds, show SS.MS format (seconds and tenths of seconds)
    int seconds = totalSeconds;
    int tenthsOfSecond = (remainingMs % 1000) / 100;  // Get tenths of seconds (0-9)
    displayValue = seconds * 100 + tenthsOfSecond;
    useDecimalPoint = true;  // Use decimal point for SS.MS
    DEBUG_PRINTF("Display update: %d ms -> %02d.%01d (SS.MS format, value: %04d)\n", 
                remainingMs, seconds, tenthsOfSecond, displayValue);
  }
  
  // Update display with appropriate separator
  if (useDecimalPoint && totalSeconds < 60) {
    display.showNumberDecEx(displayValue, 0b00100000, true);  // Show with decimal point (SS.MS)
  } else {
    display.showNumberDecEx(displayValue, 0b01000000, true);  // Show with colon (MM:SS)
  }
  
  // Track what we displayed
  lastDisplayedMs = remainingMs;
  currentTimerSeconds = totalSeconds;
  lastDisplayUpdate = millis();
  lastDisplayRefresh = millis();
}

void updateLEDs(bool running, int remainingMs) {
  // Update display
  updateDisplay(remainingMs);
  
  // Update local countdown tracking
  if (running && remainingMs > 0) {
    lastKnownRemainingMs = remainingMs;
    timerStartTime = millis();
    localCountdownActive = true;
  } else {
    localCountdownActive = false;
    lastDisplayedMs = -1;  // Force display refresh on next update
  }
  
  if (running && remainingMs > 0) {
    // Timer running
    digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
    digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
    timerRunning = true;
    timerDone = false;
  } else if (running && remainingMs <= 0) {
    // Timer done - blink status LED
    if (!timerDone) {
      timerDone = true;
      DEBUG_PRINTLN("Timer finished!");
    }
    // Blink the status LED to indicate timer is done
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink > LED_BLINK_INTERVAL_MS) {
      bool currentState = digitalRead(STATUS_LED_PIN);
      digitalWrite(STATUS_LED_PIN, !currentState);
      lastBlink = millis();
    }
    digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
    timerRunning = false;
  } else {
    // Timer idle/ready - show 00.0 on display (assuming timers are usually under 60 seconds)
    display.showNumberDecEx(0, 0b00100000, true);  // Show "00.0" with decimal point
    DEBUG_PRINTLN("Display: Timer idle - showing 00.0");
    digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
    digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
    timerRunning = false;
    timerDone = false;
  }
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      DEBUG_PRINTLN("WebSocket Disconnected");
      break;
      
    case WStype_CONNECTED:
      DEBUG_PRINTF("WebSocket Connected to: %s\n", payload);
      break;
      
    case WStype_TEXT:
      DEBUG_PRINTF("WebSocket message: %s\n", payload);
      handleWebSocketMessage((char*)payload);
      break;
      
    default:
      break;
  }
}

void handleWebSocketMessage(String message) {
  DEBUG_PRINTF("Raw WebSocket message: %s\n", message.c_str());
  
  // Parse Socket.IO message format
  if (message.startsWith("42[\"")) {
    // Extract event type and data
    int firstQuote = message.indexOf("\"", 3);
    int secondQuote = message.indexOf("\"", firstQuote + 1);
    
    if (firstQuote > 0 && secondQuote > 0) {
      String eventType = message.substring(4, firstQuote);
      DEBUG_PRINTF("Event type: %s\n", eventType.c_str());
      
      if (eventType == "start" || eventType == "reset" || eventType == "state" || eventType == "tick" || eventType == "update") {
        // Extract state data
        int dataStart = message.indexOf(",", secondQuote);
        if (dataStart > 0) {
          String stateData = message.substring(dataStart + 1, message.length() - 2);
          DEBUG_PRINTF("State data: %s\n", stateData.c_str());
          
          // Parse state JSON
          DynamicJsonDocument doc(1024);
          deserializeJson(doc, stateData);
          
          bool running = doc["running"];
          int remainingMs = doc["remainingMs"];
          
          DEBUG_PRINTF("Timer state - Running: %s, Remaining: %dms\n", 
                      running ? "true" : "false", remainingMs);
          
          updateLEDs(running, remainingMs);
          
          if (eventType == "start") {
            DEBUG_PRINTLN("Timer started via WebSocket");
          } else if (eventType == "reset") {
            DEBUG_PRINTLN("Timer reset via WebSocket");
          }
        }
      } else if (eventType == "done") {
        DEBUG_PRINTLN("Timer finished via WebSocket");
        timerDone = true;
        timerRunning = false;
        // Start blinking status LED
        digitalWrite(STATUS_LED_PIN, LED_ACTIVE_HIGH ? HIGH : LOW);
        digitalWrite(READY_LED_PIN, LED_ACTIVE_HIGH ? LOW : HIGH);
      }
    }
  }
}