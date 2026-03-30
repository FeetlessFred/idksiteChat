const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Set();

// Generate random room code
function generateRoomCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// API to create a room
app.get("/create-room", (req, res) => {
  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  rooms.add(code);
  res.json({ roomCode: code });
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinRoom", ({ roomCode, username }) => {
    if (!rooms.has(roomCode)) {
      socket.emit("errorMessage", "Room does not exist.");
      return;
    }

    socket.join(roomCode);
    socket.username = username;
    socket.roomCode = roomCode;

    socket.to(roomCode).emit("message", {
      user: "System",
      text: `${username} joined the chat`,
    });
  });

  socket.on("chatMessage", (msg) => {
    io.to(socket.roomCode).emit("message", {
      user: socket.username,
      text: msg,
    });
  });

  socket.on("disconnect", () => {
    if (socket.roomCode) {
      socket.to(socket.roomCode).emit("message", {
        user: "System",
        text: `${socket.username} left`,
      });
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
