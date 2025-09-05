# tournament-countdown

<p align="center">
	<a href="https://github.com/xaxy55/tournament-countdown/actions/workflows/github-code-scanning/codeql" target="_blank" rel="noopener">
		<img src="https://github.com/xaxy55/tournament-countdown/actions/workflows/github-code-scanning/codeql/badge.svg" alt="CodeQL" />
	</a>
	&nbsp;&nbsp;
	<a href="https://buymeacoffee.com/xaxy55" target="_blank" rel="noopener">
		<img alt="Buy me a pizza" width="200" src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20pizza&emoji=%F0%9F%8D%95&slug=xaxy55&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" />
	</a>
</p>
<p align="center">
	A tiny real-time countdown web app. Everyone sees the same timer.
	<br/>
	Start/reset via UI or HTTP API.
  
</p>

## Features
- Adjustable duration (default 30s)
- Start/reset via UI or REST API
- Real-time sync to all clients (Socket.IO)
- Optional Raspberry Pi GPIO relay blinking when time is up
- Optional end-of-timer sound (custom URL or from /sounds, with volume)
- Theme customization and settings persisted to disk
- **Arduino ESP8266 controller support** with physical buttons, LED indicators, and 7-segment display

## Table of contents

- [tournament-countdown](#tournament-countdown)
	- [Features](#features)
	- [Table of contents](#table-of-contents)
	- [Screenshots](#screenshots)
	- [Run locally](#run-locally)
		- [API](#api)
	- [Notes](#notes)
	- [Arduino ESP8266 Controller](#arduino-esp8266-controller)
	- [Raspberry Pi relay output (optional)](#raspberry-pi-relay-output-optional)
		- [Full setup on Raspberry Pi](#full-setup-on-raspberry-pi)
	- [Illustrations](#illustrations)
		- [Architecture overview](#architecture-overview)
		- [Sequence of events](#sequence-of-events)

## Screenshots

Home

<p align="center">
	<img alt="Home screen with large countdown and controls" src="./docs/screenshots/home.png" width="800">
	<br/>
	<em>Large shared timer, preset buttons, and a gear for settings.</em>

</p>

Settings

<p align="center">
	<img alt="Settings screen with Timer, GPIO, Sound, Theme sections" src="./docs/screenshots/settings.png" width="800">
	<br/>
	<em>Configure defaults, Raspberry Pi relay, end sound, and theme.</em>

</p>

Theme examples

<p align="center">
	<img alt="Theme examples showing default, custom, and high contrast" src="./docs/screenshots/theme.png" width="800">
	<br/>
	<em>Use the Theme section to customize colors.</em>

</p>

## Run locally

1. Install dependencies
2. Start the server
3. Open http://localhost:3000

Quick start (macOS/Linux):

```bash
npm install
npm run dev
# open the app
open http://localhost:3000
```

### API
- `POST /api/start` body: `{ "durationMs": number }`
- `POST /api/reset`
- `GET /api/state`
 - `GET /api/settings` — fetch current settings (defaults, presets, gpio, theme, sound)
 - `POST /api/settings` — update settings; persists to `data/settings.json`
 - `GET /api/sounds` — list available audio files under `public/sounds`

Examples:

```bash
# Start a 45 second timer
curl -sS -X POST http://localhost:3000/api/start \
	-H 'Content-Type: application/json' \
	-d '{"durationMs":45000}' | jq .

# Reset
curl -sS -X POST http://localhost:3000/api/reset | jq .

# State
curl -sS http://localhost:3000/api/state | jq .

# Settings (read)
curl -sS http://localhost:3000/api/settings | jq .

# Settings (update)
curl -sS -X POST http://localhost:3000/api/settings \
	-H 'Content-Type: application/json' \
	-d '{"defaultDurationSeconds":30,"sound":{"enabled":true,"endUrl":"/sounds/beep.mp3","volume":0.6}}' | jq .
```

OpenAPI/Swagger:

- OpenAPI JSON: `/openapi.json`
- Swagger UI: `/api-docs`

## Notes
- This uses in-memory state; restarting the server clears the countdown.
- To expose publicly, put behind a reverse proxy or deploy to a host.

## Arduino ESP8266 Controller

Physical hardware controller with buttons, LEDs, and 7-segment display for tournament countdown control.

### Features
- **2 Physical Buttons**: Start and Reset timer controls
- **2 Status LEDs**: Visual indicators for timer state
- **7-Segment Display**: Real-time countdown display in MM:SS format
- **WiFi Connectivity**: Connects to tournament server via HTTP API and WebSocket
- **Real-time Sync**: Instant updates when timer state changes
- **Easy Setup**: Configuration file for quick customization

### Hardware Required
- ESP8266 development board (NodeMCU recommended)
- TM1637 4-digit 7-segment display module
- 2x push buttons (momentary, normally open)
- 2x LEDs (Green for status, Blue for ready state)
- 2x 220Ω resistors for LED current limiting
- Breadboard and jumper wires

### Quick Start
1. Navigate to the `arduino/` directory
2. Copy `examples/config_example.h` to `config.h`
3. Update WiFi credentials and server IP in `config.h`
4. Open `tournament_controller.ino` in Arduino IDE
5. Install required libraries: ArduinoJson, WebSockets, and TM1637
6. Upload to your ESP8266

### Status Indicators
| Ready LED (Blue) | Status LED (Green) | 7-Segment Display | Timer State |
|------------------|-------------------|-------------------|-------------|
| ON | OFF | "00:00" | Ready/Idle - waiting for start |
| OFF | ON | Countdown (MM:SS) | Timer running |
| OFF | Blinking | "00:00" | Timer finished |

For complete setup instructions, wiring diagrams, and troubleshooting, see [`arduino/README.md`](arduino/README.md).

## Raspberry Pi relay output (optional)

When enabled, the Raspberry Pi will toggle a relay (or LED + resistor) using a GPIO pin and blink it when the timer completes ("Done"). Blinking stops on a new start or reset.

Env variables (set before `npm run start`):

- `GPIO_ENABLED=1` — turn on GPIO integration (default off)
- `RELAY_PIN=17` — BCM pin number to drive (default 17)
- `RELAY_ACTIVE_HIGH=1` — set `1` if relay energizes on logic HIGH; set `0` for active-LOW boards (default 1)
- `BLINK_HZ=2` — blink frequency while done (default 2 Hz)
- `BLINK_DURATION_MS=10000` — how long to blink after done (default 10000 ms)

Install deps and run on the Pi:

```sh
npm install
# Ensure user is in gpio group
sudo usermod -a -G gpio $USER
# Log out/in or run: newgrp gpio
GPIO_ENABLED=1 RELAY_PIN=17 RELAY_ACTIVE_HIGH=1 BLINK_HZ=2 BLINK_DURATION_MS=10000 npm run start
```

Wiring:

- BCM 17 (pin 11) -> relay IN (or LED anode via a current-limiting resistor)
- 3.3V/GND as required by your relay board (use a transistor + diode for bare relays)
- Never drive a bare relay coil directly from a GPIO; use a transistor driver and flyback diode, or a relay module designed for 3.3V logic.

Notes:

- Requires the `onoff` package and access to `/sys/class/gpio` (run on Raspberry Pi OS; not on macOS/Windows)
- The server remains fully functional on non-Pi hosts; GPIO is disabled unless `GPIO_ENABLED=1`
- On shutdown or reset, the output is set LOW (relay off)

### Full setup on Raspberry Pi

<details>
<summary>Show Raspberry Pi setup instructions</summary>

1) Update OS and install Node.js and Git

```sh
sudo apt update
sudo apt upgrade -y
# Install Node.js 20 LTS via NodeSource (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git
```

2) Get the app on the Pi and install deps

```sh
# If this repo is not already on the Pi
git clone https://github.com/xaxy55/tournament-countdown.git
cd tournament-countdown/counter-web
npm install
```

3) Test run (foreground)

```sh
GPIO_ENABLED=1 RELAY_PIN=17 RELAY_ACTIVE_HIGH=1 BLINK_HZ=2 BLINK_DURATION_MS=10000 PORT=3000 npm run start
```

4) Access from other devices on your network

- Find the Pi’s IP: `hostname -I`
- Open `http://<PI_IP>:3000` from any computer/phone on the same LAN
- Any connected browser can Start/Reset; the Pi will blink when the countdown finishes regardless of which device started it (server-side logic)

5) Run on boot with systemd (optional)

Create a unit file `/etc/systemd/system/tournament-countdown.service`:

```ini
[Unit]
Description=Tournament Countdown
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/home/pi/tournament-countdown/counter-web
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=GPIO_ENABLED=1
Environment=RELAY_PIN=17
Environment=RELAY_ACTIVE_HIGH=1
Environment=BLINK_HZ=2
Environment=BLINK_DURATION_MS=10000
ExecStart=/usr/bin/node server.js
Restart=on-failure
User=pi
Group=pi

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```sh
sudo systemctl daemon-reload
sudo systemctl enable tournament-countdown
sudo systemctl start tournament-countdown
sudo systemctl status tournament-countdown --no-pager
```

Troubleshooting tips:

- If GPIO access errors occur, try running as `root` or ensure your user has permission to access GPIO. Some relay boards are active-LOW; set `RELAY_ACTIVE_HIGH=0`.
- Ensure you’re using the correct BCM pin numbering and wiring. For bare relays, use a transistor driver + flyback diode, not direct GPIO.
- Change `PORT` if 3000 is in use.

</details>

## Illustrations

### Architecture overview

```mermaid
%%{init: {"flowchart": {"defaultRenderer": "elk"}} }%%
flowchart LR
	subgraph Network
		UserA[Browser A]
		UserB[Browser B]
	end
	subgraph Server["Node.js (Express + Socket.IO)"]
		API[REST API]
		Settings[(data/settings.json)]
		Sounds[[public/sounds]]
		GPIO[Relay Controller]
		Swagger[/Swagger UI\n/api-docs/]
	end
	subgraph Clients
		UI[Web UI]
		Audio[Audio Player]
	end

	UserA --> API
	UserB --> API
	UserA --> Swagger
	UI <--> API
	API --> Settings
	UI -- GET/POST /api/settings --> API
	UI -- GET /api/sounds --> API
	API --> Sounds
	API -. "socket: ticks/done" .-> UI
	UI -- on 'done': play --> Audio
	API -- on Done: blink --> GPIO
```

### Sequence of events

```mermaid
sequenceDiagram
	actor BrowserA as Browser A
	actor BrowserB as Browser B
	participant Server as Node.js Server
	participant Settings as Settings Store
	participant GPIO as Relay Controller
	participant Audio as Audio Player

	BrowserA->>Server: GET /api/settings
	Server-->>BrowserA: 200 {settings}
	opt Optional: preload sounds
		BrowserA->>Server: GET /api/sounds
		Server-->>BrowserA: 200 [files]
	end

	BrowserA->>Server: POST /api/start
	Server-->>BrowserA: 200 {state}
	Server-->>BrowserB: socket 'start'
	loop Every second
		Server-->>BrowserA: socket 'tick'
		Server-->>BrowserB: socket 'tick'
	end
	note over Server: When remainingMs hits 0
	Server-->>BrowserA: socket 'done'
	Server-->>BrowserB: socket 'done'
	BrowserA->>Audio: play end sound (URL + volume)
	Server->>GPIO: startBlinking()

	BrowserA->>Server: POST /api/settings
	Server-->>BrowserA: 200 {settings}
	Server->>Settings: persist to data/settings.json

	BrowserB->>Server: POST /api/reset
	BrowserB->>Audio: stop sound
	Server->>GPIO: stopBlinking()
```