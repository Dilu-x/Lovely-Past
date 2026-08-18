const TYPING_DELAY = 900;

export async function sendTyping(conn, jid) {
  try {
    await conn.sendPresenceUpdate("composing", jid);
  } catch (err) {
    console.error("Failed to send typing indicator:", err.message);
  }
}

export async function sendPaused(conn, jid) {
  try {
    await conn.sendPresenceUpdate("paused", jid);
  } catch (err) {
    console.error("Failed to stop typing indicator:", err.message);
  }
}

export async function withTyping(conn, jid, task, delay = TYPING_DELAY) {
  await sendTyping(conn, jid);
  const result = await task();
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  await sendPaused(conn, jid);
  return result;
}

export default { sendTyping, sendPaused, withTyping };