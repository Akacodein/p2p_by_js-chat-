const express = require("express");
const path = require("path");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",  // Allows connections from any origin
        methods: ["GET", "POST"]
    }
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Handle socket connections
io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Handle sender joining
    socket.on("sender-join", (data) => {
        socket.join(data.uid);
        console.log(`Sender joined Room: ${data.uid}`);
    });

    // Handle receiver joining
    socket.on("receiver-join", (data) => {
        socket.join(data.uid);
        console.log(`Receiver joined Room: ${data.uid}, Sender UID: ${data.sender_uid}`);
        socket.to(data.sender_uid).emit("init", data.uid);
    });

    // Handle file metadata
    socket.on("file-meta", (data) => {
        console.log(`File metadata received for UID: ${data.uid}`);
        socket.to(data.uid).emit("fs-meta", data.metadata);
    });

    // Handle file transfer start
    socket.on("fs-start", (data) => {
        console.log(`File transfer started for UID: ${data.uid}`);
        socket.to(data.uid).emit("fs-share", {});
    });

    // Handle file chunk reception
    socket.on("file-raw", (data) => {
        console.log(`File chunk received for UID: ${data.uid}, Chunk Index: ${data.chunkIndex}`);
        socket.to(data.uid).emit("fs-share", { buffer: data.buffer, chunkIndex: data.chunkIndex });
    });

    // Handle chat messages
    socket.on("chat-message", (data) => {
        console.log(`Chat message from ${data.uid}: ${data.message}`);
        socket.to(data.uid).emit("chat-message", { message: data.message });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});