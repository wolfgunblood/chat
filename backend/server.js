const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const setupSocketHandlers = require('./socketHandlers');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins
app.use(cors());
app.use('/uploads', express.static('uploads'));

const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
  },
});

// Initialize socket event handlers
setupSocketHandlers(io);

server.listen(8000, () => {
  console.log('Server is listening on port 8000');
});
