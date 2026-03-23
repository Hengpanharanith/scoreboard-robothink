const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const { SerialPort } = require("serialport")
const { ReadlineParser } = require("@serialport/parser-readline")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(__dirname))

const SERIAL_PATH = "COM3" // change this if your Arduino is on another port
const SERIAL_BAUD = 9600
const RECONNECT_DELAY_MS = 1500

let latestButtonState = false
let reconnectTimer = null
let isShuttingDown = false

const port = new SerialPort({
  path: SERIAL_PATH,
  baudRate: SERIAL_BAUD,
  autoOpen: false,
})

const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }))

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

  socket.on("toggle", (data) => {
    latestButtonState = Boolean(data)
    io.emit("update", latestButtonState)
  })

  socket.on("disconnect", () => {
    console.log("User disconnected")
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

parser.on("data", (data) => {
  const normalized = String(data).trim().toUpperCase()
  console.log("From Arduino:", normalized)

  const isOn =
    normalized === "1" ||
    normalized === "ON" ||
    normalized === "HIGH" ||
    normalized === "PRESSED" ||
    normalized === "TRUE"

  const isOff =
    normalized === "0" ||
    normalized === "OFF" ||
    normalized === "LOW" ||
    normalized === "RELEASED" ||
    normalized === "FALSE"

  if (isOn || isOff) {
    latestButtonState = isOn
    io.emit("update", latestButtonState)
    return
  }

  // Best-effort fallback for unexpected payloads.
  latestButtonState = normalized.length > 0
  io.emit("update", latestButtonState)
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
