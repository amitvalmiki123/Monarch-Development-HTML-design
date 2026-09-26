const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');
const { publicUser, id, normalizePhone } = require('../utils');

const router = express.Router();

router.get('/me', auth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.put('/me', auth, (req, res) => {
  const { name, bio, avatarColor, avatarUrl, birthday, quickReactions } = req.body;
  db.prepare(`UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio),
    avatar_color = COALESCE(?, avatar_color), avatar_url = COALESCE(?, avatar_url),
    birthday = COALESCE(?, birthday), quick_reactions = COALESCE(?, quick_reactions) WHERE id = ?`)
    .run(
      name ?? null, bio ?? null, avatarColor ?? null, avatarUrl ?? null,
      birthday ?? null, Array.isArray(quickReactions) ? JSON.stringify(quickReactions) : null,
      req.user.id
    );
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

router.get('/contacts', auth, (req, res) => {
  const rows = db.prepare(`SELECT u.* FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.owner_id = ? ORDER BY u.name`)
    .all(req.user.id);
  res.json({ contacts: rows.map(publicUser) });
});

// Device-contact sync: the app (mobile only) reads the phone's contact book
// locally and sends us just the phone numbers — never names or anything else
// — so we can tell the user which of their contacts are already on Monarch
// Chat. Matches are auto-added to the contacts list.
// NOTE: this must be registered before the '/contacts/:userId' route below,
// otherwise Express would match "match" as a :userId path param.
router.post('/contacts/match', auth, (req, res) => {
  const { phones } = req.body;
  if (!Array.isArray(phones) || phones.length === 0) return res.json({ matches: [] });

  const wanted = new Set(phones.map(normalizePhone).filter(Boolean));
  if (wanted.size === 0) return res.json({ matches: [] });

  const candidates = db.prepare('SELECT * FROM users WHERE phone IS NOT NULL AND id != ?').all(req.user.id);
  const matches = candidates.filter((u) => wanted.has(normalizePhone(u.phone)));

  const now = Date.now();
  for (const m of matches) {
    db.prepare('INSERT OR IGNORE INTO contacts (owner_id, contact_id, created_at) VALUES (?, ?, ?)').run(req.user.id, m.id, now);
  }

  res.json({ matches: matches.map(publicUser) });
});

router.post('/contacts/:userId', auth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  db.prepare('INSERT OR IGNORE INTO contacts (owner_id, contact_id, created_at) VALUES (?, ?, ?)')
    .run(req.user.id, target.id, Date.now());
  res.json({ ok: true, user: publicUser(target) });
});

module.exports = router;
