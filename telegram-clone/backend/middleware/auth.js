const { verifyToken } = require('../utils');
const db = require('../db');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (user.deleted) return res.status(401).json({ error: 'This account has been deleted' });
  req.user = user;
  next();
}

module.exports = authMiddleware;
