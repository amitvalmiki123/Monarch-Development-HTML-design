const db = require('../db');
const { id } = require('../utils');

// A session is only "touched" (last_active_at bumped) at most once every
// few minutes per row — every authenticated request going through this on
// every write would be a lot of pointless churn for a value nobody needs
// to the millisecond.
const TOUCH_THROTTLE_MS = 5 * 60 * 1000;

// Turns a raw User-Agent string into something a human can recognize in
// the Active Sessions list, e.g. "Chrome on Windows" / "Monarch Chat Android
// app". Deliberately simple pattern matching — this is a label, not a full
// UA parser.
function deviceLabelFromUserAgent(ua) {
  if (!ua) return 'Unknown device';
  if (/Capacitor|wv\)/i.test(ua) || /; wv\b/.test(ua)) return 'Monarch Chat (Android app)';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  let os = 'device';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'Mac';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
}

function createSession(userId, req) {
  const sessionId = id();
  const now = Date.now();
  const ua = req?.headers?.['user-agent'] || '';
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || null;
  db.prepare(`INSERT INTO sessions (id, user_id, device_label, user_agent, ip_address, created_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(sessionId, userId, deviceLabelFromUserAgent(ua), ua, ip, now, now);
  return sessionId;
}

// Returns the session row if it exists and hasn't been revoked, else null —
// auth middleware treats null the same as an invalid token.
function getActiveSession(sessionId) {
  if (!sessionId) return null;
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!row || row.revoked) return null;
  return row;
}

function touchSession(sessionId) {
  const row = db.prepare('SELECT last_active_at FROM sessions WHERE id = ?').get(sessionId);
  if (!row) return;
  if (Date.now() - row.last_active_at < TOUCH_THROTTLE_MS) return;
  db.prepare('UPDATE sessions SET last_active_at = ? WHERE id = ?').run(Date.now(), sessionId);
}

function listSessions(userId) {
  const rows = db.prepare('SELECT * FROM sessions WHERE user_id = ? AND revoked = 0 ORDER BY last_active_at DESC').all(userId);
  return rows.map((r) => ({
    id: r.id,
    deviceLabel: r.device_label,
    ipAddress: r.ip_address,
    createdAt: r.created_at,
    lastActiveAt: r.last_active_at
  }));
}

function revokeSession(sessionId, userId) {
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!row || row.user_id !== userId) throw new Error('NOT_FOUND');
  db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ?').run(sessionId);
}

function revokeOtherSessions(userId, currentSessionId) {
  db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ? AND id != ?').run(userId, currentSessionId);
}

module.exports = { createSession, getActiveSession, touchSession, listSessions, revokeSession, revokeOtherSessions };
