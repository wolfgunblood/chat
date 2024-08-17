const { findSession, findAllSessions } = require('../sessionManager');

module.exports = (socket, io) => {
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    const session = findSession(socket.id);
    if (session) {
      session.online = false;
      session.typing = false;
      io.emit('updateUserList', findAllSessions());
    }
  });
};
