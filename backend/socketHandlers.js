const userEvents = require('./events/userEvents');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    userEvents(io, socket);
  });
};
