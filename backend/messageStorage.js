const messageStore = new Map();
function saveMessage(to, from, message) {
  if (!messageStore.has(to)) {
    messageStore.set(to, []);
  }
  messageStore.get(to).push({ from, message });
}

function getMessageForSession(sessionId) {
  return messageStore.get(sessionId) || [];
}

function clearMessagesForSession(sessionId) {
  messageStore.delete(sessionId);
}

module.exports = { saveMessage, getMessageForSession, clearMessagesForSession };
