let displayData = {}
const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const { SerialPort } = require("serialport")
const { ReadlineParser } = require("@serialport/parser-readline")
const app = express()
const server = http.createServer(app)
const io = new Server(server)

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

  console.log(`Serial reconnect scheduled (${reason}) in ${RECONNECT_DELAY_MS}ms`)
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

function handleSerialData(data) {
  const raw = String(data).trim()
  const eventTime = new Date()
  const clockTime = eventTime.toLocaleTimeString()
  const isoTime = eventTime.toISOString()

  console.log("From Arduino:", raw)

  // Get Sample ID
  const idMatch = raw.match(/Sample ID:\s*(\d+)/i)

  // Get Message
  const stateMatch = raw.match(/Message:\s*"(true|ready)"/i)

  if (!idMatch || !stateMatch) {
    console.log("Invalid format")
    return
  }

  const sampleId = idMatch[1]
  const buttonState = stateMatch[1].toLowerCase()

  // ONLY true = pressed
  const isPressed = buttonState === "true"

  // ready = waiting state
  const isReady = buttonState === "ready"

  console.log("Parsed:", {
    sampleId,
    buttonState,
    isPressed,
    isReady
  })

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
  console.log("User connected")

  // Sync current state for newly connected clients.
  socket.emit("arduino-status", Boolean(port && port.isOpen))
  socket.emit("serial-info", { path: SERIAL_PATH, open: Boolean(port && port.isOpen) })
  socket.emit("update", latestButtonState)
  socket.emit("button-state-update", Object.values(buttonStates))

  socket.on("toggle", (data) => {
    latestButtonState = Boolean(data)
    io.emit("update", latestButtonState)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected")
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
  // send current display data when new client connects (important for OBS)
socket.emit("display-update", displayData)

// receive updates from control
socket.on("display-update", (data) => {
  displayData = data
  io.emit("display-update", data)
})
})

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

server.listen(8888, () => {
  console.log("Server running at http://localhost:8888/")
})
