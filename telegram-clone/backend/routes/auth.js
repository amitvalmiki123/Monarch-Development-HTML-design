const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { id, pickColor, signToken, publicUser } = require('../utils');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, username, phone, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username and password are required' });
    }
    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be at least 3 characters, letters/numbers/underscore only' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
    if (existing) return res.status(409).json({ error: 'This username is already taken' });

    if (phone) {
      const existingPhone = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone);
      if (existingPhone) return res.status(409).json({ error: 'This phone number is already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = id();
    const now = Date.now();
    db.prepare(`INSERT INTO users (id, username, phone, name, password_hash, avatar_color, status, last_seen, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'online', ?, ?)`).run(
      userId, username.toLowerCase(), phone || null, name, hash, pickColor(username), now, now
    );
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong during registration' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Enter your username/phone and password' });
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR phone = ?').get(identifier.toLowerCase(), identifier);
    if (!user) return res.status(401).json({ error: 'Incorrect username/phone or password' });
    if (user.deleted) return res.status(403).json({ error: 'This account has been deleted' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect username/phone or password' });
    db.prepare('UPDATE users SET status = ?, last_seen = ? WHERE id = ?').run('online', Date.now(), user.id);
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

module.exports = router;
