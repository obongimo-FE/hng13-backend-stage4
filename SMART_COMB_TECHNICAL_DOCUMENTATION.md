# Smart Comb Monitoring System
## Technical Architecture & Hardware Design Document

**Version:** 1.0  
**Project:** ESP32-CAM Based Hair Analysis Comb  
**Prepared for:** Marc and Maxime

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Overview](#project-overview)
3. [System Architecture](#system-architecture)
4. [Hardware Components](#hardware-components)
5. [ESP32-CAM Integration](#esp32-cam-integration)
6. [WiFi Configuration System](#wifi-configuration-system)
7. [Battery Management System Integration](#battery-management-system-integration)
8. [Power Management](#power-management)
9. [Image Capture & Transmission Workflow](#image-capture--transmission-workflow)
10. [Mobile App Integration](#mobile-app-integration)
11. [Reference Systems Analysis](#reference-systems-analysis)
12. [Component Specifications](#component-specifications)
13. [Integration Points](#integration-points)
14. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

This document outlines the technical architecture for a **Smart Comb Monitoring System** that integrates ESP32-CAM for hair image capture, dynamic WiFi configuration, and seamless mobile app connectivity. The system is designed to eliminate the need for code re-uploading when changing WiFi networks, similar to the API-202 device workflow.

**Key Objectives:**
- Capture high-quality hair/scalp images using ESP32-CAM
- Transmit images wirelessly to mobile application
- Dynamic WiFi configuration without code modifications
- Integration with Battery Management System (BMS)
- 5-hour continuous operation capability

---

## Project Overview

### Current State
- **Simulation Phase**: Temperature and water level sensors used for proof-of-concept
- **Target System**: ESP32-CAM based image capture system
- **Challenge**: Eliminating need to re-upload code when changing WiFi networks

### Target System
A handheld smart comb device that:
1. Captures hair/scalp images using integrated camera
2. Processes images via ESP32-CAM module
3. Transmits images to mobile app via WiFi
4. Operates independently for 5+ hours
5. Configures WiFi dynamically through mobile app

### Reference Systems
- **API-202 Device**: Hair analysis device with WiFi combo feature
- **Solutionist App**: Mobile application for device control and data visualization
- **AISG Standards**: Industry guidelines for smart device integration

---

## System Architecture

### High-Level System Block Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART COMB SYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│  │   Camera     │───>│  ESP32-CAM   │───>│   WiFi       │     │
│  │  Module     │    │   Module     │    │  Transceiver │     │
│  └──────────────┘    └──────────────┘    └──────────────┘     │
│         │                   │                    │              │
│         │                   │                    │              │
│         └───────────────────┴────────────────────┘              │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────┐                             │
│                    │   BMS &      │                             │
│                    │   Power      │                             │
│                    │   System    │                             │
│                    └──────────────┘                             │
│                              │                                   │
│                              ▼                                   │
│                    ┌──────────────┐                             │
│                    │  Li-Po      │                             │
│                    │  Battery    │                             │
│                    │  6Ah, 3.7V  │                             │
│                    └──────────────┘                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ WiFi Connection
                              ▼
                    ┌──────────────┐
                    │  Mobile App  │
                    │ (Solutionist)│
                    └──────────────┘
```

### System Layers

**Layer 1: Image Capture Layer**
- Camera module (OV2640 or similar)
- ESP32-CAM processing unit
- Image buffer and compression

**Layer 2: Communication Layer**
- WiFi transceiver (integrated in ESP32)
- Access Point (AP) mode for initial setup
- Station (STA) mode for network connection
- HTTP server for image transmission

**Layer 3: Power Management Layer**
- Battery Management System (BMS)
- Buck-boost converter
- Power path management
- Charging circuit

**Layer 4: Application Layer**
- Mobile application interface
- Image reception and processing
- WiFi configuration interface

---

## Hardware Components

### Core Components

#### 1. ESP32-CAM Module
**Specifications:**
- **Model**: ESP32-CAM or ESP32-CAM-MB (with USB interface)
- **Processor**: Dual-core Xtensa LX6 @ 240MHz
- **Memory**: 520KB SRAM, 4MB PSRAM (recommended)
- **WiFi**: 802.11 b/g/n (2.4GHz)
- **Camera Interface**: DVP (Digital Video Port)
- **GPIO**: Multiple configurable pins
- **Dimensions**: ~27mm × 40.5mm

**Key Features:**
- Built-in WiFi and Bluetooth
- Camera support (OV2640, OV7670)
- Low power consumption modes
- HTTP server capability
- SPIFFS file system support

#### 2. Camera Module
**Recommended: OV2640**
- **Resolution**: Up to 2MP (1600×1200)
- **Output Format**: JPEG, RGB565, YUV422
- **Frame Rate**: Up to 15fps @ UXGA
- **Interface**: DVP parallel interface
- **Power**: 3.3V operation
- **Size**: Compact, suitable for comb integration

**Alternative: OV7670**
- Lower resolution (VGA)
- Lower power consumption
- Smaller form factor

#### 3. Antenna
- **Type**: PCB antenna or external antenna
- **Frequency**: 2.4GHz
- **Gain**: 2-3 dBi
- **Placement**: Critical for signal strength

### Supporting Components

#### 4. Flash Memory (Optional)
- **Type**: SPI Flash
- **Capacity**: 4MB minimum (for image storage)
- **Purpose**: Store captured images temporarily
- **Interface**: SPI

#### 5. Status LEDs
- **Power LED**: Indicates device power state
- **WiFi LED**: Indicates connection status
- **Camera LED**: Indicates capture activity

#### 6. Physical Interface
- **Power Button**: On/off control
- **Capture Button**: Manual image capture trigger
- **Reset Button**: System reset

---

## ESP32-CAM Integration

### Camera Connection Diagram

```
ESP32-CAM Module
┌─────────────────────────────────┐
│                                 │
│  ┌──────────┐                  │
│  │  OV2640  │                  │
│  │  Camera  │                  │
│  └────┬─────┘                  │
│       │                         │
│       │ DVP Interface           │
│       │                         │
│  ┌────▼─────────────────────┐  │
│  │  ESP32-CAM                │  │
│  │  - GPIO 4:  XCLK          │  │
│  │  - GPIO 5:  SIOD (SDA)    │  │
│  │  - GPIO 18: SIOC (SCL)    │  │
│  │  - GPIO 19: VSYNC         │  │
│  │  - GPIO 21: HREF          │  │
│  │  - GPIO 22: PCLK          │  │
│  │  - GPIO 23: Y2            │  │
│  │  - GPIO 25: Y3            │  │
│  │  - GPIO 26: Y4            │  │
│  │  - GPIO 27: Y5            │  │
│  │  - GPIO 32: Y6            │  │
│  │  - GPIO 35: Y7            │  │
│  │  - GPIO 34: Y8            │  │
│  │  - GPIO 39: Y9            │  │
│  │  - GPIO 36: PWDN          │  │
│  │  - GPIO 2:  RESET         │  │
│  └────────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### Pin Assignment

| Function | ESP32 Pin | Camera Pin | Notes |
|----------|-----------|------------|-------|
| XCLK | GPIO 4 | XCLK | Camera clock |
| SIOD | GPIO 5 | SIOD | I2C data |
| SIOC | GPIO 18 | SIOC | I2C clock |
| VSYNC | GPIO 19 | VSYNC | Vertical sync |
| HREF | GPIO 21 | HREF | Horizontal reference |
| PCLK | GPIO 22 | PCLK | Pixel clock |
| Y2-Y9 | GPIO 23,25,26,27,32,35,34,39 | D0-D7 | Data bus |
| PWDN | GPIO 36 | PWDN | Power down |
| RESET | GPIO 2 | RESET | Reset |

### Power Requirements

**ESP32-CAM Power Consumption:**
- **Idle**: ~80mA @ 3.3V
- **WiFi Active**: ~170mA @ 3.3V
- **Camera Active**: ~200-240mA @ 3.3V
- **Peak (WiFi + Camera)**: ~300-350mA @ 3.3V

**Total System Power:**
- **Average Operation**: ~250mA @ 3.3V
- **Peak Operation**: ~350mA @ 3.3V
- **Deep Sleep**: <1mA @ 3.3V

---

## WiFi Configuration System

### Problem Statement
**Current Challenge**: Every WiFi network change requires:
1. Modifying Arduino code
2. Re-compiling
3. Re-uploading to ESP32
4. Testing connection

**Solution**: Implement dynamic WiFi configuration similar to API-202 device workflow.

### API-202 Reference Implementation

Based on the API-202 User Manual (API202.pdf), the device uses:

1. **Default AP Mode**: Device creates WiFi network "API_XXXX" (where XXXX is device ID)
2. **WiFi Combo Feature**: Device can connect to user's WiFi while maintaining AP mode
3. **Mobile App Configuration**: Solutionist app allows WiFi network selection
4. **Persistent Storage**: WiFi credentials stored in non-volatile memory

### Proposed Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              WiFi Configuration Workflow                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Initial Boot                                       │
│  ┌─────────────────────────────────────┐                  │
│  │ ESP32-CAM starts in AP Mode          │                  │
│  │ SSID: COMB_XXXX (where XXXX = ID)    │                  │
│  │ Password: Printed on device label    │                  │
│  └─────────────────────────────────────┘                  │
│                    │                                         │
│                    ▼                                         │
│  Step 2: Mobile App Connection                              │
│  ┌─────────────────────────────────────┐                  │
│  │ User connects phone to COMB_XXXX     │                  │
│  │ Opens mobile app                     │                  │
│  │ App detects device                   │                  │
│  └─────────────────────────────────────┘                  │
│                    │                                         │
│                    ▼                                         │
│  Step 3: WiFi Network Selection                            │
│  ┌─────────────────────────────────────┐                  │
│  │ App scans available WiFi networks   │                  │
│  │ User selects "Teams Wi-Fi"          │                  │
│  │ User enters password                │                  │
│  └─────────────────────────────────────┘                  │
│                    │                                         │
│                    ▼                                         │
│  Step 4: Configuration Transmission                        │
│  ┌─────────────────────────────────────┐                  │
│  │ App sends WiFi credentials via HTTP  │                  │
│  │ POST /configure-wifi                 │                  │
│  │ {ssid: "Teams Wi-Fi", pwd: "xxx"}   │                  │
│  └─────────────────────────────────────┘                  │
│                    │                                         │
│                    ▼                                         │
│  Step 5: Credential Storage                                │
│  ┌─────────────────────────────────────┐                  │
│  │ ESP32 stores credentials in         │                  │
│  │ Preferences (non-volatile memory)    │                  │
│  └─────────────────────────────────────┘                  │
│                    │                                         │
│                    ▼                                         │
│  Step 6: Network Connection                                │
│  ┌─────────────────────────────────────┐                  │
│  │ ESP32 disconnects from AP mode      │                  │
│  │ Connects to "Teams Wi-Fi"           │                  │
│  │ Obtains IP address                  │                  │
│  └─────────────────────────────────────┘                  │
│                    │                                         │
│                    ▼                                         │
│  Step 7: WiFi Combo Mode (Optional)                        │
│  ┌─────────────────────────────────────┐                  │
│  │ ESP32 maintains AP mode (COMB_XXXX) │                  │
│  │ AND connects to Teams Wi-Fi         │                  │
│  │ Allows device control + internet     │                  │
│  └─────────────────────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Details

#### 1. Non-Volatile Storage
**Technology**: ESP32 Preferences Library
- Stores WiFi SSID and password
- Persists across power cycles
- Fast read/write access
- No file system required

**Code Structure:**
```cpp
#include <Preferences.h>
Preferences preferences;

// Save WiFi credentials
preferences.begin("wifi", false);
preferences.putString("ssid", "Teams Wi-Fi");
preferences.putString("password", "password123");
preferences.end();

// Load WiFi credentials
preferences.begin("wifi", false);
String ssid = preferences.getString("ssid", "");
String password = preferences.getString("password", "");
preferences.end();
```

#### 2. Dual Mode Operation
**AP + STA Mode**: `WiFi.mode(WIFI_AP_STA)`
- Allows device to be access point AND station simultaneously
- Enables WiFi Combo functionality
- Device accessible via both networks

#### 3. Configuration Endpoint
**HTTP Endpoint**: `POST /configure-wifi`
- Receives JSON: `{"ssid": "network", "password": "pass"}`
- Validates input
- Saves to Preferences
- Reconnects to new network
- Returns new IP address

#### 4. Device Identification
**SSID Format**: `COMB_XXXX`
- XXXX = Last 4 digits of MAC address or serial number
- Unique per device
- Printed on device label/battery cover

### WiFi Combo Feature Benefits

1. **Device Control**: App can always connect via COMB_XXXX
2. **Internet Access**: Device can access internet via Teams Wi-Fi
3. **Email/Cloud**: Send analysis results immediately
4. **OTA Updates**: Over-the-air firmware updates possible

---

## Battery Management System Integration

### BMS Team Specifications

**Battery Type**: Lithium Polymer (Li-Po)
- **Voltage**: 3.7V nominal (3.0V - 4.2V range)
- **Capacity**: 6,000 mAh (6 Ah)
- **Chemistry**: Single-cell (1S) configuration
- **Form Factor**: Compact, lightweight

**Power Requirements:**
- **ESP32 Load**: 800mA peak @ 3.3V
- **Output Power**: 2.64W
- **Runtime Target**: 5 hours continuous operation
- **Efficiency**: 90% (buck-boost converter)

### BMS Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BMS Block Diagram                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USB-C Input (5V)                                           │
│       │                                                     │
│       ▼                                                     │
│  ┌──────────────┐                                          │
│  │  MCP73871    │  Charge Management IC                    │
│  │  Charger IC  │  - Power-path management                 │
│  └──────┬───────┘  - CC/CV charging                        │
│         │           - Thermal protection                    │
│         │                                                     │
│    ┌────┴────┐                                              │
│    │         │                                              │
│    ▼         ▼                                              │
│  Li-Po    System Load                                       │
│  Battery   (ESP32-CAM)                                      │
│  (6Ah)          │                                           │
│                 │                                           │
│                 ▼                                           │
│         ┌──────────────┐                                    │
│         │  MPQ28164    │  Buck-Boost Converter             │
│         │  Converter   │  - 3.0V-4.2V input                 │
│         └──────┬───────┘  - 3.3V regulated output           │
│                │           - 95% efficiency                 │
│                ▼                                           │
│          ESP32-CAM Module                                   │
│          (3.3V @ 250-350mA)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

#### 1. Power Supply Connection
**ESP32-CAM Power Input:**
- **Voltage**: 3.3V regulated
- **Current**: 250-350mA (average to peak)
- **Source**: MPQ28164 buck-boost converter output
- **Connection**: VCC and GND pins on ESP32-CAM

#### 2. Battery Monitoring (Optional)
**Fuel Gauge Integration:**
- **IC**: MAX17048 (if implemented by BMS team)
- **Interface**: I2C
- **Purpose**: Battery percentage display
- **Connection**: SDA/SCL pins on ESP32

#### 3. Charging Status
**Status Indicators:**
- **LEDs**: Connected to MCP73871 STAT pins
- **Visual Feedback**: Charging/Charged status
- **Optional**: ESP32 can read status via GPIO

#### 4. Thermal Protection
**Temperature Monitoring:**
- **Sensor**: 10kΩ NTC thermistor
- **Protection**: MCP73871 monitors battery temperature
- **Action**: Charging pauses if temperature unsafe

### Power Consumption Analysis

**System Power Budget:**

| Component | Current @ 3.3V | Power |
|-----------|----------------|-------|
| ESP32-CAM (Idle) | 80mA | 264mW |
| ESP32-CAM (WiFi) | 170mA | 561mW |
| ESP32-CAM (Camera) | 240mA | 792mW |
| ESP32-CAM (Peak) | 350mA | 1.155W |
| **Average Operation** | **250mA** | **825mW** |

**Battery Runtime Calculation:**
- Battery capacity: 6,000 mAh
- Average current: 250mA @ 3.3V
- Battery voltage: 3.7V average
- Efficiency: 90%

**Runtime = (6000 mAh × 0.9) / 250mA = 21.6 hours (theoretical)**

**Practical Runtime (with safety margin):**
- Usable capacity: 90% DoD = 5,400 mAh
- Derating: 80% = 4,320 mAh
- **Practical Runtime: 4,320 / 250 = 17.3 hours**

**Conclusion**: 6Ah battery provides **well above** 5-hour target requirement.

---

## Power Management

### Power States

**1. Active Mode**
- Camera and WiFi active
- Current: 300-350mA
- Duration: During image capture and transmission

**2. Standby Mode**
- WiFi connected, camera off
- Current: ~170mA
- Duration: Waiting for capture command

**3. Deep Sleep Mode**
- All systems off except RTC
- Current: <1mA
- Duration: Between capture sessions
- Wake-up: Timer or button press

### Power Optimization Strategies

**1. Camera Power Management**
- Power down camera when not in use
- Use PWDN pin to disable camera
- Reduces current by ~70mA

**2. WiFi Power Management**
- Use light sleep between transmissions
- Disable WiFi when not needed
- Reduces current by ~90mA

**3. Image Compression**
- Use JPEG compression (lower bandwidth)
- Reduce transmission time
- Lower overall energy consumption

**4. Adaptive Frame Rate**
- Lower frame rate for preview
- Higher frame rate only for capture
- Balance quality vs. power

---

## Image Capture & Transmission Workflow

### Capture Workflow

```
┌─────────────────────────────────────────────────────────────┐
│            Image Capture & Transmission Flow                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User Action                                            │
│     ┌─────────────────────┐                                │
│     │ Button Press /      │                                │
│     │ App Command         │                                │
│     └──────────┬──────────┘                                │
│                │                                            │
│                ▼                                            │
│  2. Camera Initialization                                  │
│     ┌─────────────────────┐                                │
│     │ - Enable camera     │                                │
│     │ - Set resolution    │                                │
│     │ - Configure frame   │                                │
│     └──────────┬──────────┘                                │
│                │                                            │
│                ▼                                            │
│  3. Image Capture                                          │
│     ┌─────────────────────┐                                │
│     │ - Capture frame     │                                │
│     │ - Buffer in PSRAM   │                                │
│     └──────────┬──────────┘                                │
│                │                                            │
│                ▼                                            │
│  4. Image Processing                                       │
│     ┌─────────────────────┐                                │
│     │ - JPEG compression  │                                │
│     │ - Quality adjustment │                                │
│     │ - Size optimization │                                │
│     └──────────┬──────────┘                                │
│                │                                            │
│                ▼                                            │
│  5. Image Storage (Optional)                              │
│     ┌─────────────────────┐                                │
│     │ - Save to SPIFFS    │                                │
│     │ - Generate filename │                                │
│     └──────────┬──────────┘                                │
│                │                                            │
│                ▼                                            │
│  6. HTTP Server Response                                   │
│     ┌─────────────────────┐                                │
│     │ - Serve image via   │                                │
│     │   HTTP endpoint     │                                │
│     │ - Base64 or binary  │                                │
│     └──────────┬──────────┘                                │
│                │                                            │
│                ▼                                            │
│  7. Mobile App Reception                                   │
│     ┌─────────────────────┐                                │
│     │ - HTTP GET request  │                                │
│     │ - Receive image     │                                │
│     │ - Display/Process   │                                │
│     └─────────────────────┘                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### HTTP Endpoints

**1. Image Capture Endpoint**
```
GET /capture
Response: JPEG image binary
Content-Type: image/jpeg
```

**2. Image with Metadata**
```
GET /capture-json
Response: {
  "image": "base64_encoded_jpeg",
  "timestamp": "2024-01-15T10:30:00Z",
  "resolution": "1600x1200",
  "size": 45678
}
```

**3. Preview Stream (Optional)**
```
GET /stream
Response: MJPEG stream
Content-Type: multipart/x-mixed-replace
```

**4. WiFi Configuration**
```
POST /configure-wifi
Body: {"ssid": "network", "password": "pass"}
Response: {"success": true, "ip": "192.168.1.100"}
```

**5. Device Status**
```
GET /status
Response: {
  "battery": 85,
  "wifi_ssid": "Teams Wi-Fi",
  "ip": "192.168.1.100",
  "uptime": 3600
}
```

### Image Specifications

**Recommended Settings:**
- **Resolution**: 1600×1200 (UXGA) or 1280×720 (HD)
- **Format**: JPEG
- **Quality**: 80-90% (balance size vs. quality)
- **Frame Rate**: 1-2 fps for capture
- **Color Space**: RGB or YUV

**File Size Estimates:**
- UXGA (1600×1200) @ 80% quality: ~150-200 KB
- HD (1280×720) @ 80% quality: ~80-120 KB
- VGA (640×480) @ 80% quality: ~30-50 KB

**Transmission Time (WiFi):**
- 200 KB image @ 1 Mbps: ~1.6 seconds
- 200 KB image @ 10 Mbps: ~0.16 seconds

---

## Mobile App Integration

### Connection Workflow (Based on API-202)

**Step 1: Initial Device Discovery**
1. User turns on smart comb
2. Device creates WiFi network: `COMB_XXXX`
3. User connects phone to `COMB_XXXX` network
4. User opens mobile app (Solutionist or custom)

**Step 2: Device Detection**
1. App scans for device on local network
2. App sends HTTP request to device
3. Device responds with status and capabilities
4. App displays device in available devices list

**Step 3: WiFi Configuration**
1. App shows WiFi network selection screen
2. User selects desired network (e.g., "Teams Wi-Fi")
3. User enters network password
4. App sends configuration to device via HTTP POST
5. Device stores credentials and connects
6. Device reports new IP address to app

**Step 4: WiFi Combo Setup (Optional)**
1. After connecting to Teams Wi-Fi, user reconnects to COMB_XXXX
2. Device maintains both connections (AP + STA)
3. App can control device via COMB_XXXX
4. Device can access internet via Teams Wi-Fi

**Step 5: Image Capture**
1. User triggers capture from app
2. App sends HTTP GET /capture to device
3. Device captures image and responds
4. App receives image and displays
5. App sends image to AI processing backend

### App Requirements

**Minimum Features:**
- WiFi network scanning
- Device discovery
- WiFi configuration interface
- Image capture trigger
- Image display
- Connection status indicator

**Advanced Features:**
- Image gallery
- Multiple device support
- Settings management
- Firmware update (OTA)
- Battery level display

---

## Reference Systems Analysis

### API-202 Device Analysis

**Key Features (from API202.pdf):**

1. **WiFi Configuration:**
   - SSID format: `API_XXXX` (where XXXX is device ID)
   - Password printed on battery cover
   - WiFi Combo feature for simultaneous AP + STA

2. **Connection Workflow:**
   - Device creates AP network
   - User connects phone to AP
   - App scans and configures WiFi
   - Device connects to selected network
   - Device maintains AP for control

3. **Mobile App (Solutionist):**
   - Device detection
   - WiFi network selection
   - Settings management
   - Analysis interface

**Lessons Learned:**
- ✅ Simple SSID format works well
- ✅ WiFi Combo enables flexible operation
- ✅ Non-volatile storage essential
- ✅ Mobile app handles configuration

### AISG Standards Reference

**Relevant Standards:**
- Device identification protocols
- Network configuration standards
- Power management guidelines
- Safety requirements

**Application:**
- Follow AISG device identification
- Implement standard network protocols
- Ensure safety compliance
- Document according to standards

---

## Component Specifications

### Complete Bill of Materials

| Component | Part Number | Quantity | Notes |
|-----------|-------------|----------|-------|
| ESP32-CAM Module | ESP32-CAM or ESP32-CAM-MB | 1 | With PSRAM recommended |
| Camera Module | OV2640 | 1 | 2MP, DVP interface |
| Li-Po Battery | Custom 6Ah, 3.7V | 1 | Single-cell, from BMS team |
| BMS Charger IC | MCP73871 | 1 | Integrated in BMS |
| Buck-Boost Converter | MPQ28164 | 1 | Integrated in BMS |
| USB-C Receptacle | Standard Type-C | 1 | For charging |
| Antenna | PCB or External | 1 | 2.4GHz WiFi |
| Flash Memory | 4MB SPI Flash | 1 | Optional, for storage |
| Status LEDs | Standard 3mm | 3 | Power, WiFi, Camera |
| Buttons | Tactile Switch | 2 | Power, Capture |
| Resistors | Various | - | Pull-ups, current limit |
| Capacitors | Ceramic, 22µF | Multiple | Power decoupling |
| NTC Thermistor | 10kΩ | 1 | Temperature monitoring |

### Physical Dimensions

**ESP32-CAM Module:**
- Length: 40.5mm
- Width: 27mm
- Height: 4.5mm (without camera)

**Camera Module (OV2640):**
- Length: 8.5mm
- Width: 8.5mm
- Height: 6mm

**Comb Integration:**
- Total size depends on comb design
- Camera placement critical for image quality
- Antenna placement affects WiFi performance

---

## Integration Points

### Hardware Integration

**1. ESP32-CAM to Camera**
- DVP parallel interface
- 18+ signal connections
- Power supply (3.3V)
- I2C for camera configuration

**2. ESP32-CAM to BMS**
- Power input: 3.3V from MPQ28164
- Ground connection
- Optional: I2C for battery monitoring

**3. ESP32-CAM to Antenna**
- RF output pin
- 50Ω impedance matching
- Proper routing critical

**4. Physical Integration**
- Camera lens positioning
- Button placement
- LED visibility
- USB-C charging port access

### Software Integration

**1. Camera Driver**
- ESP32 Camera library
- OV2640 initialization
- Frame capture functions
- Image processing

**2. WiFi Management**
- WiFi library
- AP mode setup
- STA mode connection
- Dual mode (AP+STA)

**3. HTTP Server**
- AsyncWebServer library
- Endpoint handlers
- Image serving
- Configuration interface

**4. Storage**
- Preferences library (WiFi credentials)
- SPIFFS (optional image storage)
- PSRAM (image buffering)

---

## Implementation Roadmap

### Phase 1: Hardware Prototyping (Weeks 1-2)
- [ ] ESP32-CAM module procurement
- [ ] Camera module selection and testing
- [ ] Basic circuit assembly
- [ ] Power supply testing
- [ ] Initial firmware development

### Phase 2: WiFi Configuration (Weeks 3-4)
- [ ] Implement AP mode
- [ ] Implement Preferences storage
- [ ] Develop configuration endpoint
- [ ] Test WiFi Combo functionality
- [ ] Validate credential persistence

### Phase 3: Image Capture (Weeks 5-6)
- [ ] Camera initialization
- [ ] Image capture implementation
- [ ] JPEG compression
- [ ] HTTP image serving
- [ ] Image quality optimization

### Phase 4: BMS Integration (Weeks 7-8)
- [ ] Coordinate with BMS team
- [ ] Power supply integration
- [ ] Battery monitoring (if available)
- [ ] Charging status integration
- [ ] Power consumption validation

### Phase 5: Mobile App Integration (Weeks 9-10)
- [ ] App development or modification
- [ ] Device discovery implementation
- [ ] WiFi configuration UI
- [ ] Image capture interface
- [ ] End-to-end testing

### Phase 6: Testing & Optimization (Weeks 11-12)
- [ ] System integration testing
- [ ] Power consumption optimization
- [ ] Image quality validation
- [ ] Range and reliability testing
- [ ] Documentation completion

---

## Technical Considerations

### Challenges & Solutions

**Challenge 1: Image Quality**
- **Issue**: Hair/scalp detail requires high resolution
- **Solution**: Use OV2640 at UXGA (1600×1200) with good lighting

**Challenge 2: WiFi Range**
- **Issue**: Comb may be used away from router
- **Solution**: External antenna, WiFi Combo for flexibility

**Challenge 3: Power Consumption**
- **Issue**: Camera + WiFi = high current draw
- **Solution**: Power management, deep sleep, 6Ah battery

**Challenge 4: Real-time Transmission**
- **Issue**: Large image files, slow transmission
- **Solution**: JPEG compression, quality optimization, buffering

**Challenge 5: Physical Integration**
- **Issue**: Fitting components in comb form factor
- **Solution**: Custom PCB design, compact components, efficient layout

### Safety Considerations

**1. Electrical Safety**
- Proper grounding
- Overcurrent protection
- Reverse polarity protection
- ESD protection

**2. Battery Safety**
- BMS protection circuits
- Thermal monitoring
- Overcharge/overdischarge protection
- Short circuit protection

**3. RF Safety**
- Antenna placement
- SAR compliance (if applicable)
- Interference mitigation

**4. Physical Safety**
- No sharp edges
- Secure component mounting
- Water resistance (if required)

---

## Conclusion

This document outlines a comprehensive hardware architecture for the Smart Comb Monitoring System. Key achievements:

1. **ESP32-CAM Integration**: Complete camera system design
2. **Dynamic WiFi Configuration**: Eliminates code re-upload requirement
3. **BMS Integration**: Seamless power management integration
4. **Mobile App Workflow**: Clear integration path
5. **5-Hour Operation**: Power budget validated

**Next Steps:**
1. Review with BMS team for integration details
2. Procure components for prototyping
3. Begin Phase 1 implementation
4. Schedule regular integration checkpoints

