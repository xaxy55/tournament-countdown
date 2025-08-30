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

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include "config.h"

// Button debouncing
unsigned long lastStartPress = 0;
unsigned long lastResetPress = 0;

// Timer state
bool timerRunning = false;
bool timerDone = false;
unsigned long lastStatusCheck = 0;

// WebSocket client for real-time updates
WebSocketsClient webSocket;

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  
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
  
  // Periodically check server status if WebSocket is not connected
  if (!webSocket.isConnected() && millis() - lastStatusCheck > STATUS_CHECK_INTERVAL_MS) {
    checkTimerStatus();
    lastStatusCheck = millis();
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
  
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/start");
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
  
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/reset");
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
  
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/state");
  
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

void updateLEDs(bool running, int remainingMs) {
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
    // Timer idle/ready
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
  // Parse Socket.IO message format
  if (message.startsWith("42[\"")) {
    // Extract event type and data
    int firstQuote = message.indexOf("\"", 3);
    int secondQuote = message.indexOf("\"", firstQuote + 1);
    
    if (firstQuote > 0 && secondQuote > 0) {
      String eventType = message.substring(4, firstQuote);
      
      if (eventType == "start" || eventType == "reset" || eventType == "state" || eventType == "tick") {
        // Extract state data
        int dataStart = message.indexOf(",", secondQuote);
        if (dataStart > 0) {
          String stateData = message.substring(dataStart + 1, message.length() - 2);
          
          // Parse state JSON
          DynamicJsonDocument doc(1024);
          deserializeJson(doc, stateData);
          
          bool running = doc["running"];
          int remainingMs = doc["remainingMs"];
          
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