// let displayData = {}
// const express = require("express")
// const http = require("http")
// const { Server } = require("socket.io")
// const { SerialPort } = require("serialport")
// const { ReadlineParser } = require("@serialport/parser-readline")
// const app = express()
// const server = http.createServer(app)
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"],
//     allowedHeaders: ["*"],
//     credentials: true
//   },
//   maxHttpBufferSize: 50 * 1024 * 1024, // 50 MB
//   reconnection: true,
//   reconnectionDelay: 100,
//   reconnectionDelayMax: 5000,
//   reconnectionAttempts: 5
  
// })

// app.use(express.static(__dirname))



// let SERIAL_PATH = process.env.Serial_Port || "COM3"
// const SERIAL_BAUD = parseInt(process.env.Serial_Baud_Rate) || 115200

// const RECONNECT_DELAY_MS = 1500

// let latestButtonState = false
// let buttonStates = {
//   1: { id: 1, state: "ready", pressed: false, ready: true },
//   2: { id: 2, state: "ready", pressed: false, ready: true },
//   3: { id: 3, state: "ready", pressed: false, ready: true },
//   4: { id: 4, state: "ready", pressed: false, ready: true },
//   5: { id: 5, state: "ready", pressed: false, ready: true },
// }
// let reconnectTimer = null
// let isShuttingDown = false

// let port = null
// let parser = null

// function createPort(path) {
//   port = new SerialPort({ path, baudRate: SERIAL_BAUD, autoOpen: false })
//   parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }))

//   port.on("open", () => {
//     console.log("Port opened")
//     io.emit("arduino-status", true)
//     io.emit("serial-info", { path: SERIAL_PATH, open: true })
//   })

//   port.on("close", () => {
//     console.log("Arduino disconnected")
//     io.emit("arduino-status", false)
//     io.emit("serial-info", { path: SERIAL_PATH, open: false })
//     scheduleReconnect("close")
//   })

//   port.on("error", (err) => {
//     console.log("Serial error:", err.message)
//     io.emit("arduino-status", false)
//     io.emit("serial-info", { path: SERIAL_PATH, open: false })
//     scheduleReconnect("error")
//   })

//   parser.on("data", handleSerialData)
//   return port
// }

// function emitButtonStateSnapshot(target = io) {
//   target.emit("button-state-update", Object.values(buttonStates))
// }

// function scheduleReconnect(reason) {
//   if (isShuttingDown || reconnectTimer || (port && port.isOpen)) return

//   // console.log(`Serial reconnect scheduled (${reason}) in ${RECONNECT_DELAY_MS}ms`)
//   reconnectTimer = setTimeout(() => {
//     reconnectTimer = null
//     openSerial("retry")
//   }, RECONNECT_DELAY_MS)
// }

// function openSerial(source) {
//   if (isShuttingDown) return
//   if (port && port.isOpen) return

//   if (!port) createPort(SERIAL_PATH)

//   port.open((err) => {
//     if (err) {
//       console.log(`Port open failed (${source}):`, err.message)
//       io.emit("arduino-status", false)
//       io.emit("serial-info", { path: SERIAL_PATH, open: false })
//       scheduleReconnect("open-failed")
//       return
//     }

//     console.log(`Arduino connected (${source})`)
//     io.emit("serial-info", { path: SERIAL_PATH, open: true })
//   })
// }

// function closePort(cb) {
//   if (!port) {
//     if (cb) cb()
//     return
//   }

//   try {
//     if (port.isOpen) {
//       port.close(() => {
//         parser = null
//         port = null
//         if (cb) cb()
//       })
//       return
//     }
//   } catch (e) {
//     console.log('Error closing port', e && e.message)
//   }

//   parser = null
//   port = null
//   if (cb) cb()
// }

// function handleSerialData(data) {
//   const raw = String(data).trim()
//   const eventTime = new Date()
//   const clockTime = eventTime.toLocaleTimeString()
//   const isoTime = eventTime.toISOString()

//   console.log("From Arduino:", raw)

//   // Get Sample ID
//   const idMatch = raw.match(/Sample ID:\s*(\d+)/i)

//   // Get Message
//   const stateMatch = raw.match(/Message:\s*"(true|ready)"/i)

//   if (!idMatch || !stateMatch) {
//     console.log("Invalid format")
//     return
//   }

//   const sampleId = idMatch[1]
//   const buttonState = stateMatch[1].toLowerCase()

//   // ONLY true = pressed
//   const isPressed = buttonState === "true"

//   // ready = waiting state
//   const isReady = buttonState === "ready"

//   console.log("Parsed:", {
//     sampleId,
//     buttonState,
//     isPressed,
//     isReady
//   })

//   io.emit("button-update", {
//     id: sampleId,
//     pressed: isPressed,
//     ready: isReady,
//     state: buttonState,
//     clockTime,
//     isoTime
//   })
// }

// io.on("connection", (socket) => {
//   const socketId = socket.id
//   console.log("User connected:", socketId)

//   // Sync current state for newly connected clients.
//   socket.emit("arduino-status", Boolean(port && port.isOpen))
//   socket.emit("serial-info", { path: SERIAL_PATH, open: Boolean(port && port.isOpen) })
//   socket.emit("update", latestButtonState)
//   socket.emit("button-state-update", Object.values(buttonStates))
  
//   // Send current display data when new client connects (important for OBS/display screens)
//   if (displayData && Object.keys(displayData).length > 0) {
//     socket.emit("display-update", displayData)
//     console.log("Sent display data to", socketId)
//   }

//   socket.on("toggle", (data) => {
//     latestButtonState = Boolean(data)
//     io.emit("update", latestButtonState)
//   })

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socketId)
//   })

//   socket.on('set-serial', (data) => {
//     const newPath = data && data.path ? String(data.path) : null
//     if (!newPath) return
//     if (newPath === SERIAL_PATH) {
//       socket.emit('serial-info', { path: SERIAL_PATH, open: port && port.isOpen })
//       return
//     }

//     console.log('Changing serial port to', newPath)
//     // update path and restart port
//     SERIAL_PATH = newPath
//     closePort(() => {
//       // small delay to ensure close completes
//       setTimeout(() => openSerial('manual-change'), 200)
//     })
//   })

//   // Receive updates from control panel
//   socket.on("display-update", (data) => {
//     if (!data) return
//     displayData = data
//     console.log("Display update received, broadcasting to all clients")
//     // Broadcast to ALL connected clients (including OBS, display screens, etc.)
//     io.emit("display-update", data)
//   })
// })

// openSerial("startup")

// function shutdown() {
//   isShuttingDown = true

//   if (reconnectTimer) {
//     clearTimeout(reconnectTimer)
//     reconnectTimer = null
//   }

//   if (port && port.isOpen) {
//     port.close(() => process.exit(0))
//     return
//   }

//   process.exit(0)
// }

// process.on("SIGINT", shutdown)
// process.on("SIGTERM", shutdown)

// server.listen(8888, () => {
//   console.log("Server running at http://localhost:8888/")
// })



let displayData = {
  blueScore: 0,
  redScore: 0,
  blueName: "BLUE TEAM",
  redName: "RED TEAM",
  blueImg: "",
  redImg: "",
  compName: "FOLLOW LINE ROBOT CUP",
  roundNum: 1,
  roundLabel: "QUALIFICATION",
  blueSwitches: {},
  redSwitches: {},
  blueFinalDestTime: "",
  redFinalDestTime: "",
  blueGoalBeforeTime: "",
  redGoalBeforeTime: ""
}

let timerState = {
  phase: 'idle',       // 'idle' | 'prep' | 'play'
  prepTotal: 30,
  playTotal: 120,
  remaining: 0,
  running: false
}

const FINAL_DEST_POINTS = 25

function formatMMSS(sec) {
  const s = Math.max(0, sec)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
}

function getPlayTimerDisplay() {
  if (timerState.phase === 'play') return formatMMSS(timerState.remaining)
  if (timerState.phase === 'done') return '00:00'
  return formatMMSS(timerState.playTotal)
}

const express = require("express")
const http = require("http")
const os = require("os")
const { Server } = require("socket.io")
const { SerialPort } = require("serialport")
const { ReadlineParser } = require("@serialport/parser-readline")
const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  },
  maxHttpBufferSize: 50 * 1024 * 1024, // 50 MB
  reconnection: true,
  reconnectionDelay: 100,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
  
})

app.use(express.static(__dirname))



let SERIAL_PATH = process.env.Serial_Port || "COM3"
const SERIAL_BAUD = parseInt(process.env.Serial_Baud_Rate) || 115200

const RECONNECT_DELAY_MS = 1500

let latestButtonState = false
let buttonStates = {
  1: { id: 1, state: "ready", pressed: false, ready: true },
  2: { id: 2, state: "ready", pressed: false, ready: true },
  3: { id: 3, state: "ready", pressed: false, ready: true },
  4: { id: 4, state: "ready", pressed: false, ready: true },
  5: { id: 5, state: "ready", pressed: false, ready: true },
  6: { id: 6, state: "ready", pressed: false, ready: true },
}
let reconnectTimer = null
let isShuttingDown = false

let port = null
let parser = null

function createPort(path) {
  port = new SerialPort({ path, baudRate: SERIAL_BAUD, autoOpen: false })
  parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }))

  port.on("open", () => {
    console.log("Port opened")
    io.emit("arduino-status", true)
    io.emit("serial-info", { path: SERIAL_PATH, open: true })
  })

  port.on("close", () => {
    console.log("Arduino disconnected")
    io.emit("arduino-status", false)
    io.emit("serial-info", { path: SERIAL_PATH, open: false })
    scheduleReconnect("close")
  })

  port.on("error", (err) => {
    console.log("Serial error:", err.message)
    io.emit("arduino-status", false)
    io.emit("serial-info", { path: SERIAL_PATH, open: false })
    scheduleReconnect("error")
  })

  parser.on("data", handleSerialData)
  return port
}

function emitButtonStateSnapshot(target = io) {
  target.emit("button-state-update", Object.values(buttonStates))
}

function scheduleReconnect(reason) {
  if (isShuttingDown || reconnectTimer || (port && port.isOpen)) return

  // console.log(`Serial reconnect scheduled (${reason}) in ${RECONNECT_DELAY_MS}ms`)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    openSerial("retry")
  }, RECONNECT_DELAY_MS)
}

function openSerial(source) {
  if (isShuttingDown) return
  if (port && port.isOpen) return

  if (!port) createPort(SERIAL_PATH)

  port.open((err) => {
    if (err) {
      console.log(`Port open failed (${source}):`, err.message)
      io.emit("arduino-status", false)
      io.emit("serial-info", { path: SERIAL_PATH, open: false })
      scheduleReconnect("open-failed")
      return
    }

    console.log(`Arduino connected (${source})`)
    io.emit("serial-info", { path: SERIAL_PATH, open: true })
  })
}

function closePort(cb) {
  if (!port) {
    if (cb) cb()
    return
  }

  try {
    if (port.isOpen) {
      port.close(() => {
        parser = null
        port = null
        if (cb) cb()
      })
      return
    }
  } catch (e) {
    console.log('Error closing port', e && e.message)
  }

  parser = null
  port = null
  if (cb) cb()
}

// Repeats of the same button+state arriving faster than this are treated as
// streaming/bounce noise and dropped. Slower than this is a real new press and
// is always sent through (so a held/stuck button can never swallow a later
// press of the same button).
const BUTTON_DEBOUNCE_MS = 150

function handleSerialData(data) {
  const raw = String(data)
  const eventTime = new Date()
  const clockTime = eventTime.toLocaleTimeString()
  const isoTime = eventTime.toISOString()

  // A single serial chunk can carry more than one "Sample ID ... Message" pair
  // (e.g. several buttons fire at once and a newline gets dropped). Parse EVERY
  // pair, not just the first, so no simultaneous press is lost.
  const re = /Sample ID:\s*(\d+)[\s\S]*?Message:\s*"(true|ready)"/gi
  let m
  while ((m = re.exec(raw)) !== null) {
    emitButtonEvent(m[1], m[2].toLowerCase(), eventTime.getTime(), clockTime, isoTime)
  }
}

function emitButtonEvent(sampleId, buttonState, now, clockTime, isoTime) {
  // ONLY true = pressed; ready = waiting state
  const isPressed = buttonState === "true"
  const isReady = buttonState === "ready"

  const prev = buttonStates[sampleId]
  if (prev && prev.state === buttonState) {
    // Same state as last time. Refresh the timestamp (so a continuously held
    // button keeps sliding the window and never re-emits), and only drop it
    // while the repeats keep coming faster than the debounce window.
    const recent = now - (prev.lastSeen || 0) < BUTTON_DEBOUNCE_MS
    prev.lastSeen = now
    if (recent) return
  }

  buttonStates[sampleId] = {
    id: Number(sampleId),
    state: buttonState,
    pressed: isPressed,
    ready: isReady,
    lastSeen: now,
  }

  console.log("Button change:", sampleId, "->", buttonState)

  io.emit("button-update", {
    id: sampleId,
    pressed: isPressed,
    ready: isReady,
    state: buttonState,
    clockTime,
    isoTime
  })
}

io.on("connection", (socket) => {
  const socketId = socket.id
  console.log("User connected:", socketId)

  // Sync current state for newly connected clients.
  socket.emit("arduino-status", Boolean(port && port.isOpen))
  socket.emit("serial-info", { path: SERIAL_PATH, open: Boolean(port && port.isOpen) })
  socket.emit("update", latestButtonState)
  socket.emit("button-state-update", Object.values(buttonStates))
  
  // Send current display data when new client connects (important for OBS/display screens)
  if (displayData && Object.keys(displayData).length > 0) {
    socket.emit("display-update", displayData)
    socket.emit("scoreboard-state", displayData)
    console.log("Sent display data to", socketId)
  }

  socket.on("toggle", (data) => {
    latestButtonState = Boolean(data)
    io.emit("update", latestButtonState)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socketId)
  })

  socket.on('set-serial', (data) => {
    const newPath = data && data.path ? String(data.path) : null
    if (!newPath) return
    if (newPath === SERIAL_PATH) {
      socket.emit('serial-info', { path: SERIAL_PATH, open: port && port.isOpen })
      return
    }

    console.log('Changing serial port to', newPath)
    // update path and restart port
    SERIAL_PATH = newPath
    closePort(() => {
      // small delay to ensure close completes
      setTimeout(() => openSerial('manual-change'), 200)
    })
  })

  // Receive updates from control panel (legacy display-update)
  socket.on("display-update", (data) => {
    if (!data) return
    displayData = data
    console.log("Display update received, broadcasting to all clients")
    // Broadcast to ALL connected clients (including OBS, display screens, etc.)
    io.emit("display-update", data)
    io.emit("scoreboard-state", data)
  })

  // ===== NEW SCOREBOARD MULTI-CONTROLLER EVENTS =====
  socket.on("score-change", (data) => {
    const { team, delta } = data
    if (!team || delta === undefined) return
    
    const scoreKey = team + "Score"
    let newScore = (displayData[scoreKey] || 0) + delta
    if (newScore < 0) newScore = 0
    
    displayData[scoreKey] = newScore

    // If score is reset to 0, clear switches and final destination time
    if (newScore === 0) {
      displayData[team + "Switches"] = {};
      displayData[team + "FinalDestTime"] = "";
    }

    console.log(`Score updated: ${team} now ${newScore} (controller: ${socketId})`)
    
    // Broadcast to ALL clients
    io.emit("scoreboard-state", displayData)
  })

  socket.on("tech-switch-change", (data) => {
    const { team, switchName, status, delta, timeStr } = data
    if (!team || !switchName || !status) return

    const switchesKey = team + "Switches"
    if (!displayData[switchesKey]) displayData[switchesKey] = {}

    if (status === "ready" || status === "subtracted") {
      delete displayData[switchesKey][switchName]
    } else {
      displayData[switchesKey][switchName] = status
    }

    if (switchName === "Final Destination") {
      const timeKey = team + "FinalDestTime"
      displayData[timeKey] = status === "added" ? (timeStr || getPlayTimerDisplay()) : ""
    }

    if (switchName === "Goal Before Opponent" || switchName === "Before Opponent") {
      const timeKey = team + "GoalBeforeTime"
      displayData[timeKey] = status === "added" ? (timeStr || getPlayTimerDisplay()) : ""
    }

    const scoreKey = team + "Score"
    let scoreDelta = delta
    if (switchName === "Final Destination") {
      scoreDelta = status === "added" ? FINAL_DEST_POINTS : -FINAL_DEST_POINTS
    }
    let newScore = (displayData[scoreKey] || 0) + scoreDelta
    if (newScore < 0) newScore = 0
    displayData[scoreKey] = newScore

    console.log(`Switch updated: ${team} - ${switchName} is now ${status} (controller: ${socketId})`)
    io.emit("scoreboard-state", displayData)
  })

  socket.on("team-update", (data) => {
    const { team, field, value } = data
    if (!team || !field) return
    
    const key = team + (field === "name" ? "Name" : "Img")
    displayData[key] = value
    console.log(`Team update: ${key} updated (controller: ${socketId})`)
    
    // Broadcast to ALL clients
    io.emit("scoreboard-state", displayData)
  })

  socket.on("meta-update", (data) => {
    if (!data) return
    
    if (data.compName !== undefined) displayData.compName = data.compName
    if (data.roundNum !== undefined) displayData.roundNum = data.roundNum
    if (data.roundLabel !== undefined) displayData.roundLabel = data.roundLabel
    
    console.log("Meta update:", data, `(controller: ${socketId})`)
    
    // Broadcast to ALL clients
    io.emit("scoreboard-state", displayData)
  })

  socket.on("reset-scores", () => {
    displayData.blueScore = 0
    displayData.redScore = 0
    displayData.blueSwitches = {}
    displayData.redSwitches = {}
    displayData.blueFinalDestTime = ""
    displayData.redFinalDestTime = ""
    displayData.blueGoalBeforeTime = ""
    displayData.redGoalBeforeTime = ""
    console.log("Scores and switches reset (controller: " + socketId + ")")
    io.emit("scoreboard-state", displayData)
  })

  // Send timer state to new connection
  socket.emit('timer-state', timerState)

  socket.on('timer-set', (data) => {
    if (data.prepTotal !== undefined) timerState.prepTotal = parseInt(data.prepTotal) || 30
    if (data.playTotal !== undefined) timerState.playTotal = parseInt(data.playTotal) || 120
    io.emit('timer-state', timerState)
  })

  socket.on('timer-control', (data) => {
    const { action, phase } = data
    if (action === 'start') {
      const requestedPhase = phase === 'prep' || phase === 'play' ? phase : null

      // An explicit START must also work while the other phase is running.
      // Previously the outer `!timerState.running` guard silently ignored it.
      if (requestedPhase && timerState.phase !== requestedPhase) {
        timerState.phase = requestedPhase
        timerState.remaining = requestedPhase === 'prep'
          ? timerState.prepTotal
          : timerState.playTotal
      } else if (timerState.phase === 'idle' || timerState.phase === 'done') {
        timerState.phase = requestedPhase || 'prep'
        timerState.remaining = timerState.phase === 'prep'
          ? timerState.prepTotal
          : timerState.playTotal
      }
      timerState.running = true
    } else if (action === 'pause') {
      timerState.running = false
    } else if (action === 'reset') {
      timerState.running = false
      if (phase) {
        timerState.phase = phase
        timerState.remaining = phase === 'prep' ? timerState.prepTotal : timerState.playTotal
      } else {
        timerState.phase = 'idle'
        timerState.remaining = 0
      }
    }
    io.emit('timer-state', timerState)
  })
})

// Server-side countdown tick
setInterval(() => {
  if (!timerState.running) return
  if (timerState.remaining > 0) {
    timerState.remaining -= 1
    io.emit('timer-state', timerState)
  } else {
    timerState.running = false
    timerState.phase = 'done'
    io.emit('timer-state', timerState)
  }
}, 1000)

openSerial("startup")

function shutdown() {
  isShuttingDown = true

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (port && port.isOpen) {
    port.close(() => process.exit(0))
    return
  }

  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

function getLocalIPs() {
  const nets = os.networkInterfaces()
  const ips = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Keep only external (non-internal) IPv4 addresses.
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address)
      }
    }
  }
  return ips
}

const PORT = 8888

// Listen on 0.0.0.0 so other devices on the same network can reach it.
server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running at:")
  console.log(`  Local:   http://localhost:${PORT}/`)
  const ips = getLocalIPs()
  if (ips.length) {
    ips.forEach((ip) => console.log(`  Network: http://${ip}:${PORT}/`))
  } else {
    console.log("  Network: no external IPv4 address found")
  }
})
