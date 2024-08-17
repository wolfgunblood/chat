const { findSessionById, findAllSessions } = require('../sessionManager');

module.exports = (socket, io) => {
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    const session = findSessionById(socket.id);
    if (session) {
      removeSession(session.sessionId);
      io.emit('updateUserList', findAllSessions());
    }
  });
};
