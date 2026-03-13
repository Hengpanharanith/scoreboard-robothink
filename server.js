const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(__dirname))

server.listen(8888, () => {
  console.log("Server running at http://localhost:8888/")
})