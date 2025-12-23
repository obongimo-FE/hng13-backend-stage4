# Smart Comb System - Visual Diagrams

## Complete System Architecture

```mermaid
graph TB
    subgraph "Smart Comb Device"
        subgraph "Image Capture System"
            CAM[OV2640 Camera Module<br/>2MP, DVP Interface]
            ESP32[ESP32-CAM Module<br/>Dual-core, WiFi, PSRAM]
            CAM -->|DVP Interface<br/>18 signals| ESP32
        end
        
        subgraph "Power Management System"
            BMS[MCP73871<br/>Battery Charger IC]
            CONV[MPQ28164<br/>Buck-Boost Converter]
            BAT[Li-Po Battery<br/>6Ah, 3.7V]
            USB[USB-C Port<br/>5V Input]
            
            USB -->|5V| BMS
            BMS -->|Charge| BAT
            BMS -->|Power Path| CONV
            BAT -->|3.0-4.2V| CONV
            CONV -->|3.3V Regulated| ESP32
        end
        
        subgraph "User Interface"
            BTN1[Power Button]
            BTN2[Capture Button]
            LED1[Power LED]
            LED2[WiFi LED]
            LED3[Camera LED]
        end
        
        ESP32 -->|Control| BTN1
        ESP32 -->|Control| BTN2
        ESP32 -->|Status| LED1
        ESP32 -->|Status| LED2
        ESP32 -->|Status| LED3
    end
    
    subgraph "Wireless Communication"
        WIFI[WiFi 2.4GHz<br/>802.11 b/g/n]
        ESP32 <-->|RF Signal| WIFI
    end
    
    subgraph "Mobile Application"
        APP[Solutionist App<br/>or Custom App]
        WIFI <-->|HTTP/HTTPS| APP
    end
    
    subgraph "Network Infrastructure"
        ROUTER[WiFi Router<br/>Teams Wi-Fi]
        INTERNET[Internet<br/>Cloud Services]
        WIFI <-->|STA Mode| ROUTER
        ROUTER <--> INTERNET
    end
    
    style ESP32 fill:#3498db,stroke:#2980b9,stroke-width:3px,color:#fff
    style CAM fill:#e74c3c,stroke:#c0392b,stroke-width:2px,color:#fff
    style BMS fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff
    style APP fill:#9b59b6,stroke:#8e44ad,stroke-width:2px,color:#fff
```

## WiFi Configuration Flow

```mermaid
sequenceDiagram
    participant User
    participant Phone
    participant App
    participant ESP32 as ESP32-CAM
    participant Router as WiFi Router
    
    Note over ESP32: Device Boots
    ESP32->>ESP32: Start AP Mode<br/>SSID: COMB_XXXX
    
    Note over User,Phone: Initial Connection
    User->>Phone: Connect to COMB_XXXX
    Phone->>ESP32: WiFi Connection Established
    User->>App: Open Solutionist App
    App->>ESP32: HTTP GET /status
    ESP32-->>App: Device Info & Status
    
    Note over User,App: WiFi Configuration
    User->>App: Select "Teams Wi-Fi" Network
    User->>App: Enter Password
    App->>ESP32: POST /configure-wifi<br/>{"ssid":"Teams Wi-Fi","password":"xxx"}
    ESP32->>ESP32: Save to Preferences<br/>(Non-volatile)
    ESP32->>ESP32: Disconnect from AP Mode
    ESP32->>Router: Connect to Teams Wi-Fi
    Router-->>ESP32: IP Address Assigned
    ESP32->>ESP32: Enable WiFi Combo<br/>(AP + STA Mode)
    ESP32-->>App: {"success":true,"ip":"192.168.1.100"}
    
    Note over User,Router: WiFi Combo Active
    User->>Phone: Reconnect to COMB_XXXX<br/>(for device control)
    Phone->>ESP32: Connected via AP
    ESP32->>Router: Connected via STA<br/>(for internet access)
```

## Image Capture & Transmission Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant ESP32 as ESP32-CAM
    participant Camera as OV2640 Camera
    participant AI as AI Processing
    
    Note over User,App: Capture Initiation
    User->>App: Tap "Capture" Button
    App->>ESP32: HTTP GET /capture
    
    Note over ESP32,Camera: Image Capture
    ESP32->>Camera: Initialize Camera
    Camera-->>ESP32: Ready
    ESP32->>Camera: Capture Frame
    Camera-->>ESP32: Raw Image Data
    ESP32->>ESP32: Buffer in PSRAM
    
    Note over ESP32: Image Processing
    ESP32->>ESP32: JPEG Compression<br/>(Quality: 80-90%)
    ESP32->>ESP32: Optimize Size
    
    Note over ESP32,App: Image Transmission
    ESP32-->>App: HTTP Response<br/>JPEG Image Binary
    App->>App: Display Image
    
    Note over App,AI: AI Processing
    App->>AI: Send Image for Analysis
    AI-->>App: Analysis Results
    App->>User: Display Results
```

## Power Management Flow

```mermaid
stateDiagram-v2
    [*] --> Off
    Off --> Charging: USB-C Connected
    Charging --> Charged: Battery Full
    Charged --> Standby: USB Disconnected
    
    Off --> Standby: Power Button Press
    Standby --> Active: Capture Command
    Active --> Standby: Capture Complete
    Standby --> DeepSleep: Timeout (5 min)
    DeepSleep --> Standby: Wake Trigger
    
    Standby --> Charging: USB-C Connected
    Active --> Charging: USB-C Connected
    
    note right of Charging
        MCP73871 manages
        CC/CV charging
        Thermal protection
    end note
    
    note right of Active
        Peak: 350mA @ 3.3V
        Camera + WiFi active
    end note
    
    note right of DeepSleep
        <1mA @ 3.3V
        RTC only active
    end note
```

## BMS Integration Architecture

```mermaid
graph LR
    subgraph "Input Power"
        USB[USB-C<br/>5V, 2A]
    end
    
    subgraph "Battery Management"
        CHARGER[MCP73871<br/>Charger IC]
        BAT[Li-Po Battery<br/>6Ah, 3.7V<br/>3.0-4.2V Range]
    end
    
    subgraph "Power Regulation"
        CONV[MPQ28164<br/>Buck-Boost<br/>Converter]
        OUT[3.3V Regulated<br/>Output]
    end
    
    subgraph "Load"
        ESP32[ESP32-CAM<br/>250-350mA]
    end
    
    subgraph "Monitoring"
        NTC[10kΩ NTC<br/>Thermistor]
        STAT[Status LEDs<br/>Charging/Charged]
    end
    
    USB -->|5V| CHARGER
    CHARGER -->|Charge Current| BAT
    CHARGER -->|Power Path| CONV
    BAT -->|3.0-4.2V| CONV
    CONV -->|3.3V| OUT
    OUT --> ESP32
    
    NTC -->|Temperature| CHARGER
    CHARGER -->|Status| STAT
    
    style CHARGER fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff
    style CONV fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    style BAT fill:#f39c12,stroke:#e67e22,stroke-width:2px,color:#fff
```

## Component Interconnection Diagram

```mermaid
graph TB
    subgraph "ESP32-CAM Module"
        ESP[ESP32-CAM<br/>Main Processor]
        PSRAM[4MB PSRAM<br/>Image Buffer]
        FLASH[4MB Flash<br/>Optional Storage]
    end
    
    subgraph "Camera Interface"
        OV[OV2640 Camera<br/>18-pin DVP]
        XCLK[GPIO 4: XCLK]
        SIOD[GPIO 5: SIOD]
        SIOC[GPIO 18: SIOC]
        VSYNC[GPIO 19: VSYNC]
        HREF[GPIO 21: HREF]
        PCLK[GPIO 22: PCLK]
        DATA[GPIO 23,25,26,27<br/>32,35,34,39: Y2-Y9]
        PWDN[GPIO 36: PWDN]
        RST[GPIO 2: RESET]
    end
    
    subgraph "Power Supply"
        VCC[3.3V from BMS]
        GND[Ground]
    end
    
    subgraph "WiFi Antenna"
        ANT[2.4GHz Antenna<br/>50Ω]
    end
    
    subgraph "User Interface"
        PWR_BTN[Power Button]
        CAP_BTN[Capture Button]
        PWR_LED[Power LED]
        WIFI_LED[WiFi LED]
        CAM_LED[Camera LED]
    end
    
    ESP --> PSRAM
    ESP --> FLASH
    ESP --> OV
    
    XCLK --> OV
    SIOD --> OV
    SIOC --> OV
    VSYNC --> OV
    HREF --> OV
    PCLK --> OV
    DATA --> OV
    PWDN --> OV
    RST --> OV
    
    VCC --> ESP
    GND --> ESP
    VCC --> OV
    GND --> OV
    
    ESP --> ANT
    ESP --> PWR_BTN
    ESP --> CAP_BTN
    ESP --> PWR_LED
    ESP --> WIFI_LED
    ESP --> CAM_LED
    
    style ESP fill:#3498db,stroke:#2980b9,stroke-width:3px,color:#fff
    style OV fill:#e74c3c,stroke:#c0392b,stroke-width:2px,color:#fff
    style VCC fill:#2ecc71,stroke:#27ae60,stroke-width:2px,color:#fff
```

## Data Flow Architecture

```mermaid
flowchart TD
    START([User Action]) --> TRIGGER{Trigger Type}
    
    TRIGGER -->|Button Press| BTN[Hardware Button]
    TRIGGER -->|App Command| APP[HTTP Request]
    
    BTN --> INIT[Initialize Camera]
    APP --> INIT
    
    INIT --> CONFIG[Configure Camera<br/>Resolution, Quality]
    CONFIG --> CAPTURE[Capture Frame]
    
    CAPTURE --> BUFFER[Buffer in PSRAM]
    BUFFER --> COMPRESS[JPEG Compression]
    
    COMPRESS --> STORE{Store Image?}
    STORE -->|Yes| SPIFFS[Save to SPIFFS]
    STORE -->|No| SERVE[HTTP Response]
    SPIFFS --> SERVE
    
    SERVE --> TRANSMIT[Transmit to App]
    TRANSMIT --> RECEIVE[App Receives Image]
    
    RECEIVE --> DISPLAY[Display in App]
    RECEIVE --> AI[Send to AI Processing]
    
    AI --> RESULTS[Analysis Results]
    RESULTS --> USER([User Views Results])
    DISPLAY --> USER
    
    style START fill:#3498db,color:#fff
    style CAPTURE fill:#e74c3c,color:#fff
    style AI fill:#9b59b6,color:#fff
    style USER fill:#2ecc71,color:#fff
```

## WiFi Mode State Machine

```mermaid
stateDiagram-v2
    [*] --> AP_Mode: Device Boot
    
    AP_Mode: Access Point Mode
    AP_Mode: SSID: COMB_XXXX
    AP_Mode: Waiting for Connection
    
    AP_Mode --> AP_STA_Mode: WiFi Config Received
    AP_STA_Mode: Dual Mode
    AP_STA_Mode: AP: COMB_XXXX
    AP_STA_Mode: STA: User Network
    
    AP_STA_Mode --> STA_Mode: AP Disabled
    STA_Mode: Station Mode Only
    STA_Mode: Connected to User Network
    
    STA_Mode --> AP_STA_Mode: Re-enable AP
    AP_STA_Mode --> AP_Mode: Network Disconnect
    
    AP_Mode --> DeepSleep: Timeout
    STA_Mode --> DeepSleep: Timeout
    AP_STA_Mode --> DeepSleep: Timeout
    
    DeepSleep --> AP_Mode: Wake Up
    
    note right of AP_STA_Mode
        WiFi Combo Feature
        Device accessible via COMB_XXXX
        Internet access via user network
    end note
```

## Power Consumption Timeline

```mermaid
gantt
    title Power Consumption During Operation Cycle
    dateFormat X
    axisFormat %L ms
    
    section Active Capture
    Camera Init        :0, 100
    Image Capture      :100, 200
    JPEG Compression   :200, 300
    WiFi Transmission  :300, 1600
    Total Active       :0, 1900
    
    section Standby
    WiFi Connected     :1900, 300000
    Camera Off         :1900, 300000
    
    section Deep Sleep
    All Systems Off    :300000, 3600000
```

## System Integration Points

```mermaid
graph TB
    subgraph "Hardware Team"
        HW1[ESP32-CAM Integration]
        HW2[Camera Mounting]
        HW3[Antenna Placement]
        HW4[Button/LED Integration]
    end
    
    subgraph "BMS Team"
        BMS1[Power Supply Design]
        BMS2[Charging Circuit]
        BMS3[Battery Integration]
        BMS4[Thermal Management]
    end
    
    subgraph "Software Team"
        SW1[Camera Driver]
        SW2[WiFi Management]
        SW3[HTTP Server]
        SW4[Image Processing]
    end
    
    subgraph "Mobile App Team"
        APP1[Device Discovery]
        APP2[WiFi Configuration UI]
        APP3[Image Capture Interface]
        APP4[AI Integration]
    end
    
    HW1 --> SW1
    HW2 --> SW1
    HW3 --> SW2
    HW4 --> SW3
    
    BMS1 --> HW1
    BMS2 --> HW1
    BMS3 --> HW1
    BMS4 --> HW1
    
    SW2 --> APP2
    SW3 --> APP3
    SW4 --> APP4
    
    style HW1 fill:#3498db,color:#fff
    style BMS1 fill:#2ecc71,color:#fff
    style SW1 fill:#9b59b6,color:#fff
    style APP1 fill:#e74c3c,color:#fff
```

