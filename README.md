# RoboThink Scoreboard

Real-time scoreboard system for RoboThink events.

## How to run

1. Install dependencies.

```bash
npm install
```

2. Start the Node server.

```bash
npm start
```

3. Open the app in your browser.

```text
http://localhost:8888/index.html
http://localhost:8888/config.html
http://localhost:8888/display.html
```

## Project flow

The project runs as a simple live data loop:

Arduino button input -> `server.js` -> Socket.IO -> browser pages

`server.js` is the center of the system. It:

- Serves the files from the project root with Express
- Opens the serial connection to the Arduino
- Listens for button data from the Arduino
- Broadcasts updates to every connected browser page

The browser pages each have a role:

- `index.html` is the main control page for the operator
- `config.html` is the configuration screen
- `display.html` is the live audience/projector display

When the operator changes something in the browser, the update is sent to `server.js`, then pushed to the other pages in real time.

## Current server settings

- Port: `8888`
- Serial path: `COM7` (Update that com port to make it the same as Device Manager)
- Serial baud rate: `115200`

If your Arduino uses a different COM port, update `SERIAL_PATH` in `server.js`.

## How to use it With OBS 
##Techbot 
  1. Visit index.html after running the project
  2. Click Techbot Butoon on the top right
  3. After you see the Controller of Techbot please open the display of techbot
  4. Replace the localhost to your ipv4 for OBS Browser source
  5. For red Team controller : YOURIPV4:8888/red-techbot.html
  6. For blue Team controller :  YOURIPV4:8888/blue-techbot.html
##Robothink 
  1. After run the project 
  2. Create Browser source in OBS 
  3. Input the URL (Your ipv4:8888/display.html) Ex: http://172.20.10.2:8888/display.html
  4. Control page url is (Your ipv4:8888) EX: http://172.20.10.2:8080/ (Can use it on phone or other Device browser)

Note : All device need the same Network
