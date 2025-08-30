# ESP32 Tournament Controller - Detailed Wiring Diagram

## Circuit Schematic

```mermaid
graph LR
    subgraph "ESP32-WROOM-32 DevKit"
        subgraph "Power Pins"
            VIN[VIN]
            GND3[GND]
            V3[3V3]
            EN[EN]
        end
        
        subgraph "GPIO Pins Used"
            GPIO2[GPIO2<br/>Start Button]
            GPIO4[GPIO4<br/>Reset Button]
            GPIO5[GPIO5<br/>Status LED]
            GPIO18[GPIO18<br/>Ready LED]
        end
        
        subgraph "Ground Pins"
            GND1[GND]
            GND2[GND]
        end
    end
    
    subgraph "Push Buttons"
        subgraph "Start Button Circuit"
            SB[Start Button<br/>Momentary NO]
            SB_C1[Terminal 1]
            SB_C2[Terminal 2]
        end
        
        subgraph "Reset Button Circuit"
            RB[Reset Button<br/>Momentary NO]
            RB_C1[Terminal 1]
            RB_C2[Terminal 2]
        end
    end
    
    subgraph "LED Circuits"
        subgraph "Status LED Circuit"
            R1[220Ω Resistor]
            LED1[Status LED<br/>Green<br/>3mm or 5mm]
            LED1_A[Anode +]
            LED1_K[Cathode -]
        end
        
        subgraph "Ready LED Circuit"
            R2[220Ω Resistor]
            LED2[Ready LED<br/>Blue<br/>3mm or 5mm]
            LED2_A[Anode +]
            LED2_K[Cathode -]
        end
    end
    
    %% Power connections
    VIN -.->|5V USB or External| USB[USB/External 5V]
    GND3 -.->|Common Ground| COMMON_GND[Common Ground]
    
    %% Button connections
    GPIO2 -->|Digital Input| SB_C1
    SB_C2 --> GND1
    SB_C1 -.->|Internal Pull-up| V3
    
    GPIO4 -->|Digital Input| RB_C1
    RB_C2 --> GND1
    RB_C1 -.->|Internal Pull-up| V3
    
    %% LED connections
    GPIO5 -->|Digital Output| R1
    R1 --> LED1_A
    LED1_K --> GND2
    
    GPIO18 -->|Digital Output| R2
    R2 --> LED2_A
    LED2_K --> GND2
    
    %% Styling
    style GPIO2 fill:#ffeb3b
    style GPIO4 fill:#ffeb3b
    style GPIO5 fill:#4caf50
    style GPIO18 fill:#2196f3
    style LED1 fill:#4caf50
    style LED2 fill:#2196f3
    style SB fill:#ffeb3b
    style RB fill:#ff9800
    style R1 fill:#f44336
    style R2 fill:#f44336
```

## Breadboard Layout

```mermaid
graph TD
    subgraph "Breadboard Layout"
        subgraph "Power Rails"
            POS_RAIL[+ Rail 3.3V]
            NEG_RAIL[- Rail GND]
        end
        
        subgraph "ESP32 Placement"
            ESP32_BOARD[ESP32 DevKit<br/>Straddling Center]
            ESP32_LEFT[Left Side Pins]
            ESP32_RIGHT[Right Side Pins]
        end
        
        subgraph "Component Placement"
            START_BTN_AREA[Start Button<br/>Area A]
            RESET_BTN_AREA[Reset Button<br/>Area B]
            LED_AREA[LED Circuits<br/>Area C]
            RESISTOR_AREA[Resistors<br/>Area D]
        end
    end
    
    ESP32_BOARD --> ESP32_LEFT
    ESP32_BOARD --> ESP32_RIGHT
    ESP32_LEFT -.->|3.3V| POS_RAIL
    ESP32_LEFT -.->|GND| NEG_RAIL
    
    START_BTN_AREA -.->|Wire to GPIO2| ESP32_LEFT
    RESET_BTN_AREA -.->|Wire to GPIO4| ESP32_LEFT
    LED_AREA -.->|Wire to GPIO5,18| ESP32_RIGHT
    RESISTOR_AREA --> LED_AREA
    
    START_BTN_AREA -.-> NEG_RAIL
    RESET_BTN_AREA -.-> NEG_RAIL
    LED_AREA -.-> NEG_RAIL
```

## Component Specifications

### ESP32 Development Board
- **Model**: ESP32-WROOM-32 or compatible
- **Operating Voltage**: 3.3V (5V tolerant on some pins)
- **Flash Memory**: 4MB minimum
- **WiFi**: 802.11 b/g/n

### Push Buttons
- **Type**: Momentary contact, normally open (NO)
- **Rating**: 12V DC, 50mA minimum
- **Mounting**: Through-hole or surface mount
- **Debouncing**: Handled in software

### LEDs
- **Status LED**: Green, 3mm or 5mm
  - **Forward Voltage**: ~2.0-2.2V
  - **Forward Current**: 20mA
- **Ready LED**: Blue, 3mm or 5mm
  - **Forward Voltage**: ~3.0-3.3V
  - **Forward Current**: 20mA

### Resistors
- **Value**: 220Ω
- **Power Rating**: 1/4W minimum
- **Tolerance**: 5% or better
- **Type**: Carbon film or metal film

## Electrical Calculations

### LED Current Limiting Resistors

For Green LED (Status):
```
R = (Vcc - Vf) / If
R = (3.3V - 2.1V) / 0.02A = 60Ω minimum
```

For Blue LED (Ready):
```
R = (Vcc - Vf) / If  
R = (3.3V - 3.1V) / 0.02A = 10Ω minimum
```

**Note**: 220Ω is used for both to provide a safety margin and similar brightness levels.

## Wire Connections Summary

| From | To | Wire Color Suggestion | Function |
|------|----|--------------------|----------|
| ESP32 3.3V | Breadboard + Rail | Red | Power |
| ESP32 GND | Breadboard - Rail | Black | Ground |
| ESP32 GPIO2 | Start Button Pin 1 | Yellow | Start Input |
| Start Button Pin 2 | GND Rail | Black | Button Ground |
| ESP32 GPIO4 | Reset Button Pin 1 | Orange | Reset Input |
| Reset Button Pin 2 | GND Rail | Black | Button Ground |
| ESP32 GPIO5 | 220Ω Resistor | Green | Status LED Control |
| 220Ω Resistor | Green LED Anode | Green | LED Positive |
| Green LED Cathode | GND Rail | Black | LED Ground |
| ESP32 GPIO18 | 220Ω Resistor | Blue | Ready LED Control |
| 220Ω Resistor | Blue LED Anode | Blue | LED Positive |
| Blue LED Cathode | GND Rail | Black | LED Ground |

## Safety Notes

- Always disconnect power when making wiring changes
- Verify polarity of LEDs before applying power
- Ensure proper current limiting with resistors
- Use appropriate wire gauge (22-26 AWG recommended)
- Double-check connections before powering on