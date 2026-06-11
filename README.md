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

# How to Use with OBS

## Techbot

1. Run the project and open `index.html`.
2. Click the **Techbot** button in the top-right corner.
3. Once the Techbot controller appears, open the Techbot display page.
4. Replace `localhost` with your device's IPv4 address when configuring the OBS Browser Source.
5. Red Team controller URL:

   ```
   http://YOUR_IPV4:8888/red-techbot.html
   ```
6. Blue Team controller URL:

   ```
   http://YOUR_IPV4:8888/blue-techbot.html
   ```

## Robothink

1. Run the project.
2. Create a **Browser Source** in OBS.
3. Enter the display URL:

   ```
   http://YOUR_IPV4:8888/display.html
   ```

   Example:

   ```
   http://172.20.10.2:8888/display.html
   ```
4. Access the control page using:

   ```
   http://YOUR_IPV4:8080/
   ```

   Example:

   ```
   http://172.20.10.2:8080/
   ```

   This URL can be opened from a phone or any other device connected to the network.

> **Note:** All devices (OBS computer, controller device, and display device) must be connected to the same local network.
