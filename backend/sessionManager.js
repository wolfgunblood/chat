const sessions = new Map();
const userMap = new Map();

function saveSession(socketId, sessionId, username, mediaType, mediaUrl) {
  if (userMap.has(username)) {
    return false;
  }
  sessions.set(sessionId, {
    socketId,
    sessionId,
    username,
    online: true,
    typing: false,
    picture: 'https://avatar.iran.liara.run/public',
    mediaType,
    mediaUrl,
  });
  userMap.set(username, sessionId);
  return true;
}

function removeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    userMap.delete(session.username);
    sessions.delete(sessionId);
  }
}

function findSessionById(sessionId) {
  return sessions.get(sessionId);
}

function findSessionByUsername(username) {
  const sessionId = userMap.get(username);
  return sessionId ? sessions.get(sessionId) : null;
}

function findAllSessions() {
  return Array.from(sessions.values());
}

module.exports = {
  saveSession,
  removeSession,
  findSessionById,
  findSessionByUsername,
  findAllSessions,
};
