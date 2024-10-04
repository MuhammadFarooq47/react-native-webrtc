const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Initialize the app and the server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
    cors: {
        origin: '*', // Allow requests from any origin (adjust this as needed for your security)
    }
});

// Serve a simple route for the base URL
app.get('/', (req, res) => {
    res.send('Socket.IO WebRTC Signaling Server');
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle offer from a client
    socket.on('offer', (data) => {
        console.log('Offer received from', socket.id);
        // Relay the offer to the other peers
        socket.broadcast.emit('offer', data);
    });

    // Handle answer from a client
    socket.on('answer', (data) => {
        console.log('Answer received from', socket.id);
        // Relay the answer to the other peers
        socket.broadcast.emit('answer', data);
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        console.log('ICE Candidate received from', socket.id);
        // Relay the ICE candidate to the other peers
        socket.broadcast.emit('ice-candidate', data);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server is running on port ${PORT}`);
});
