const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { id, pickColor, signToken, signPendingTwoStepToken, verifyToken, publicUser } = require('../utils');
const profileService = require('../services/profileService');
const sessionService = require('../services/sessionService');
const auth = require('../middleware/auth');

const router = express.Router();

function fullSessionPayload(user, req) {
  const sessionId = sessionService.createSession(user.id, req);
  const token = signToken(user, sessionId);
  return { token, user: { ...publicUser(user), ...profileService.getProfileExtras(user.id) } };
}

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
    res.json(fullSessionPayload(user, req));
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

    // Two-Step Verification is on for this account — the normal password
    // alone isn't enough to get a session; hand back a short-lived pending
    // token that only /auth/two-step can redeem.
    if (user.two_step_hash) {
      return res.json({
        requiresTwoStep: true,
        pendingToken: signPendingTwoStepToken(user),
        hint: user.two_step_hint || ''
      });
    }

    db.prepare('UPDATE users SET status = ?, last_seen = ? WHERE id = ?').run('online', Date.now(), user.id);
    res.json(fullSessionPayload(user, req));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong during login' });
  }
});

router.post('/two-step', async (req, res) => {
  try {
    const { pendingToken, password } = req.body;
    if (!pendingToken || !password) return res.status(400).json({ error: 'Missing cloud password' });
    const payload = verifyToken(pendingToken);
    if (!payload || !payload.pending2fa) return res.status(401).json({ error: 'That login attempt expired — please log in again' });
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
    if (!user || user.deleted) return res.status(401).json({ error: 'Account not found' });
    if (!user.two_step_hash) return res.status(400).json({ error: 'Two-step verification is not enabled on this account' });

    const ok = await bcrypt.compare(password, user.two_step_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect cloud password' });

    db.prepare('UPDATE users SET status = ?, last_seen = ? WHERE id = ?').run('online', Date.now(), user.id);
    res.json(fullSessionPayload(user, req));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Something went wrong verifying your cloud password' });
  }
});

// Ends the session tied to the token used to call this — the account stays
// logged in everywhere else, exactly like Telegram's per-device logout.
router.post('/logout', auth, (req, res) => {
  if (req.sessionId) {
    try { sessionService.revokeSession(req.sessionId, req.user.id); } catch { /* already gone */ }
  }
  res.json({ ok: true });
});

module.exports = router;
