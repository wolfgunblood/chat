const sessions = new Map();

function saveSession(socketId, sessionId, username) {
  sessions.set(sessionId, {
    socketId,
    sessionId,
    username,
    online: true,
    typing: false,
  });
  return sessions;
}

function findSession(sessionId) {
  return sessions.get(sessionId);
}

function findAllSessions() {
  return Array.from(sessions.values());
}

function clearMessagesForSession(sessionId) {
  // Implementation
}

module.exports = {
  saveSession,
  findSession,
  findAllSessions,
  clearMessagesForSession,
};
