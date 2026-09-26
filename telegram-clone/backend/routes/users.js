const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');
const { publicUser, id } = require('../utils');

const router = express.Router();

router.get('/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/me', auth, (req, res) => {
  const { name, bio, avatarColor } = req.body;
  db.prepare('UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), avatar_color = COALESCE(?, avatar_color) WHERE id = ?')
    .run(name ?? null, bio ?? null, avatarColor ?? null, req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicUser(updated) });
});

router.get('/search', auth, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [] });
  const rows = db.prepare(`SELECT * FROM users WHERE (LOWER(username) LIKE ? OR LOWER(name) LIKE ? OR phone LIKE ?) AND id != ? LIMIT 20`)
    .all(`%${q}%`, `%${q}%`, `%${q}%`, req.user.id);
  res.json({ users: rows.map(publicUser) });
});

router.post('/contacts/:userId', auth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: 'User nahi mila' });
  db.prepare('INSERT OR IGNORE INTO contacts (owner_id, contact_id, created_at) VALUES (?, ?, ?)')
    .run(req.user.id, target.id, Date.now());
  res.json({ ok: true, user: publicUser(target) });
});

router.get('/contacts', auth, (req, res) => {
  const rows = db.prepare(`SELECT u.* FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.owner_id = ? ORDER BY u.name`)
    .all(req.user.id);
  res.json({ contacts: rows.map(publicUser) });
});

module.exports = router;
