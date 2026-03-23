# RoboThink Scoreboard

Real-time scoreboard system for RoboThink events with:
- Control panel for operator actions
- Live display page for audience/projector
- Optional Arduino serial input for hardware button state

## Current Architecture

Arduino -> SerialPort (USB/COM) -> Node.js server -> Socket.IO -> Browser UIs

The Node server is the central hub that:
- Serves static files from this folder
- Reads Arduino serial data
- Broadcasts live events to connected pages

## Project Structure (Current)

```text
scoreboard-robothink/
|- server.js
|- package.json
|- package-lock.json
|- index.html         # Main control panel
|- display.html       # Audience display screen
|- testing.html       # Arduino/socket status test page
|- sponsor_logo/      # Sponsor images
|- push_button/       # Arduino/button related assets
|- README.md
```

## Features

### Control panel (index.html)
- Edit event and round info
- Manage teams (2-5), names, and robot images
- Mark finish order and export results to XLS
- Timer controls (start/pause/reset/custom minutes)
- Background upload and sponsor/partner logo uploads
- Open live display window

### Display screen (display.html)
- Shows event/round, teams, finish ranks, timer, and uploaded media
- Receives updates in real time from the control panel data stream

### Arduino test page (testing.html)
- Shows Arduino connection status (`arduino-status`)
- Shows button state (`update`)
- Useful for validating serial-to-UI flow quickly

### Server (server.js)
- Express static file hosting
- Socket.IO real-time messaging
- SerialPort integration on `COM3` at `9600` baud
- Auto reconnect after Arduino restart/disconnect (no Node restart required)

## Run

1. Install dependencies

```bash
npm install
```

2. Start server

```bash
npm start
```

3. Open pages

- Control: http://localhost:8888/index.html
- Display: http://localhost:8888/display.html
- Arduino test: http://localhost:8888/testing.html

## Socket Events Used

- `arduino-status` -> `true/false` connection state
- `update` -> button state boolean
- `toggle` -> frontend/manual state push (rebroadcast as `update`)

## Arduino Serial Notes

`server.js` maps these incoming serial values:
- ON values: `1`, `ON`, `HIGH`, `PRESSED`, `TRUE`
- OFF values: `0`, `OFF`, `LOW`, `RELEASED`, `FALSE`

If the Arduino is not on `COM3`, update `SERIAL_PATH` in `server.js`.

## Dev Notes

- This project currently serves files from the root folder using `express.static(__dirname)`.
- If you later move files into a `public/` folder, update static path and README links accordingly.
