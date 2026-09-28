const { verifyToken } = require('../utils');
const db = require('../db');
const { getActiveSession, touchSession } = require('../services/sessionService');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  if (payload.pending2fa) return res.status(401).json({ error: 'Two-step verification required' });

  // Tokens issued before this feature shipped won't carry a `sid` — treat
  // those as still valid (no session row to check) rather than logging
  // everyone out the moment this deploys. Any token minted from now on
  // always has one, so this branch is purely a one-time compatibility
  // shim, not a security hole worth worrying about long-term.
  if (payload.sid) {
    const session = getActiveSession(payload.sid);
    if (!session) return res.status(401).json({ error: 'This session has been signed out. Please log in again.' });
    touchSession(payload.sid);
    req.sessionId = payload.sid;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.deleted) return res.status(401).json({ error: 'This account has been deleted' });
  req.user = user;
  next();
}

module.exports = authMiddleware;
