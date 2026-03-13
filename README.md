# Scoreboard System – Project Flow

## Overview

This project is a **real-time tournament scoreboard system** with a **control panel**, **display screen**, and optional **Arduino emergency button control**.

The system allows an operator to control:

* Team names
* Scores
* Timer (start / pause / reset)
* Team logos
* Background image
* Sponsor logos

The display screen updates **live in real time**.

---

# System Architecture

```
Arduino Button
      │
      │ Serial (USB)
      ▼
Node.js Server
      │
      │ WebSocket (Socket.IO)
      ▼
Control Screen (Browser)
      │
      ▼
Display Screen (Browser / Projector)
```

---

# Project Structure

```
scoreboard-system
│
├── server.js              # Node.js backend server
├── package.json           # Node dependencies
├── .gitignore             # Ignore node_modules
│
├── public
│   ├── control.html       # Operator control panel
│   └── display.html       # Audience display screen
│
├── arduino
│   └── emergency_button.ino
│
└── README.md
```

---

# Components

## 1. Node.js Server

The Node.js server acts as the **central communication hub**.

Responsibilities:

* Serve HTML files
* Connect to Arduino via **SerialPort**
* Broadcast real-time events via **Socket.IO**
* Synchronize control and display screens

Technologies:

* Express
* Socket.IO
* SerialPort

---

## 2. Control Screen (Operator Panel)

The control interface allows the operator to manage the scoreboard.

Features:

* Edit team names
* Upload team logos
* Increase / decrease score
* Start / pause / reset timer
* Upload background image
* Upload sponsor logos
* Open display screen

When changes occur, the control panel sends updates to the server:

```
Control Panel
      │
      ▼
Socket.IO emit
      │
      ▼
Node Server
      │
      ▼
Broadcast update
      │
      ▼
Display Screen
```

---

## 3. Display Screen (Audience Screen)

The display screen shows the scoreboard to the audience or projector.

Displayed elements:

* Team names
* Team logos
* Scores
* Game timer
* Sponsor logos
* Background image

This screen **listens for real-time updates** from the Node server.

---

## 4. Arduino Emergency Button

The Arduino provides **hardware control** for critical functions like timer control.

Example usage:

* Start timer
* Pause timer
* Reset timer

Workflow:

```
Button Press
     │
     ▼
Arduino
     │
Serial message
     │
     ▼
Node.js SerialPort
     │
     ▼
WebSocket event
     │
     ▼
Control Panel Timer Function
```

Example command from Arduino:

```
START
PAUSE
RESET
TEAM_A_PLUS
TEAM_B_PLUS
```

---

# Runtime Flow

## Application Startup

1. Start Node server

```
npm start
```

2. Server starts on:

```
http://localhost:3000
```

3. Open control panel

```
http://localhost:3000/control.html
```

4. Operator opens display screen.

---

# Score Update Flow

```
Operator clicks +1
        │
        ▼
Control Panel
        │
Socket.IO emit
        │
        ▼
Node Server
        │
Broadcast update
        │
        ▼
Display Screen updates score
```

---

# Timer Control Flow

```
Start Button
     │
     ▼
Control Panel Timer
     │
Emit timer state
     │
     ▼
Node Server
     │
Broadcast
     │
     ▼
Display Screen timer updates
```

---

# Arduino Emergency Button Flow

```
Emergency Button Press
        │
        ▼
Arduino detects input
        │
Serial.println("PAUSE")
        │
        ▼
Node SerialPort receives message
        │
        ▼
Socket.IO event emitted
        │
        ▼
Control Panel executes pauseTimer()
        │
        ▼
Display screen updates
```

---

# Development Workflow

Start development server:

```
npm start
```

Open browser:

```
http://localhost:3000/control.html
```

Edit code → refresh browser.

For automatic restart during development:

```
nodemon server.js
```

---

# Future Improvements

Possible upgrades for the system:

* Animated scoreboard transitions
* Sponsor logo carousel
* Wireless Arduino buttons
* Keyboard shortcuts for operator
* OBS streaming overlay
* Multi-display support
* Tournament round management

---

# Summary

This project creates a **professional real-time tournament scoreboard system** with:

* Web-based control panel
* Real-time audience display
* Hardware emergency control
* Node.js communication layer

The architecture allows the system to scale for **live events, tournaments, and competitions**.
