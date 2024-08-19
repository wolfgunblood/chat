const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const setupSocketHandlers = require('./socketHandlers');
const { saveSession } = require('./sessionManager');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use('/uploads', express.static('uploads'));

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });
app.get('/', (req, res) => {
  // console.log('Helath');
  res.status(200).send('Health okk');
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  const { sessionId, mediaType } = req.body;

  // const session = findSession(sessionId);
  // if (session) {
  //   // session.mediaUrl = fileUrl;
  //   // session.mediaType = mediaType;
  //   saveSession(mediaUrl, mediaType, sessionId);
  // }

  res.status(200).json({ fileUrl });
});

// Initialize socket event handlers
setupSocketHandlers(io);

server.listen(8000, () => {
  console.log('Server is listening on port 8000');
});
