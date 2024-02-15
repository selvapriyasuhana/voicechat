const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose'); 
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const mongodb = require("./Config/Mongoconfig.js");
require('dotenv').config();

// Define schema for voice messages
const voiceMessageSchema = new mongoose.Schema({
    userId: { type: String }, 
    data: { type: Buffer }, 
    timestamp: { type: Date, default: Date.now } 
});

// Create VoiceMessage model using schema
const VoiceMessage = mongoose.model('VoiceMessage', voiceMessageSchema);

// Serve your static files (e.g., HTML, CSS, JS)
app.use(express.static(__dirname + '/public'));

// Connect to MongoDB
mongoose.connect(mongodb.url, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("MongoDB Connected Successfully");
    })
    .catch(error => {
        console.error("Error connecting to MongoDB:", error);
    });

// Store socket connections
const activeSockets = {};

io.on('connection', (socket) => {
    // Generate a unique ID for each user
    const userId = uuidv4();
    activeSockets[userId] = socket;

    console.log('a user connected:', userId);

    socket.on('disconnect', () => {
        delete activeSockets[userId];
        console.log('user disconnected:', userId);
    });

    // Save received voice messages to MongoDB
socket.on('voice_message', (data) => {
    // Save the voice message to the database
    const voiceMessage = new VoiceMessage({
        userId,
        data,
        timestamp: new Date()
    });

    voiceMessage.save()
        .then(() => {
            console.log('Voice message saved to MongoDB');
        })
        .catch(err => {
            console.error('Error saving voice message to MongoDB:', err);
        });

    // Broadcast received voice messages to all connected clients
    for (const socketId in activeSockets) {
        activeSockets[socketId].emit('voice_message', data);
    }
    
});
});
const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log("Server running on port " + port);
});
