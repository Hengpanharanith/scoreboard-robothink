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

const SERIAL_PATH = "COM7" // change this if your Arduino is on another port
const SERIAL_BAUD = 115200
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

const port = new SerialPort({
  path: SERIAL_PATH,
  baudRate: SERIAL_BAUD,
  autoOpen: false,
})

const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }))

function emitButtonStateSnapshot(target = io) {
  target.emit("button-state-update", Object.values(buttonStates))
}

function scheduleReconnect(reason) {
  if (isShuttingDown || reconnectTimer || port.isOpen) return

  console.log(`Serial reconnect scheduled (${reason}) in ${RECONNECT_DELAY_MS}ms`)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    openSerial("retry")
  }, RECONNECT_DELAY_MS)
}

function openSerial(source) {
  if (isShuttingDown || port.isOpen) return

  port.open((err) => {
    if (err) {
      console.log(`Port open failed (${source}):`, err.message)
      io.emit("arduino-status", false)
      scheduleReconnect("open-failed")
      return
    }

    console.log(`Arduino connected (${source})`)
  })
}

io.on("connection", (socket) => {
  console.log("User connected")

  // Sync current state for newly connected clients.
  socket.emit("arduino-status", port.isOpen)
  socket.emit("update", latestButtonState)
  socket.emit("button-state-update", Object.values(buttonStates))

  socket.on("toggle", (data) => {
    latestButtonState = Boolean(data)
    io.emit("update", latestButtonState)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected")
  })
  // send current display data when new client connects (important for OBS)
socket.emit("display-update", displayData)

// receive updates from control
socket.on("display-update", (data) => {
  displayData = data
  io.emit("display-update", data)
})
})

port.on("open", () => {
  console.log("Port opened")
  io.emit("arduino-status", true)
})

port.on("close", () => {
  console.log("Arduino disconnected")
  io.emit("arduino-status", false)
  scheduleReconnect("close")
})

port.on("error", (err) => {
  console.log("Serial error:", err.message)
  io.emit("arduino-status", false)
  scheduleReconnect("error")
})
// DATA print
parser.on("data", (data) => {
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
})

openSerial("startup")

function shutdown() {
  isShuttingDown = true

  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }

  if (port.isOpen) {
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
