const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db');
const auth = require('../middleware/auth');
const { publicUser, id, normalizePhone } = require('../utils');
const profileService = require('../services/profileService');
const premiumService = require('../services/premiumService');

const router = express.Router();

// Own-profile responses (and only own-profile ones — other users' payloads
// elsewhere in the app don't need this) include the profile-photo gallery
// and story-ring state the Profile screen's redesign needs.
function withExtras(user) {
  // appIcon is a device-preference field, only meaningful to the owning
  // account itself (not exposed via publicUser to other users' views).
  return { ...publicUser(user), ...profileService.getProfileExtras(user.id), appIcon: user.app_icon || 'default' };
}

router.get('/me', auth, (req, res) => {
  res.json({ user: withExtras(req.user) });
});

router.put('/me', auth, (req, res) => {
  const {
    name, bio, avatarColor, birthday, quickReactions, nameColor, statusEmoji, appIcon, badgeStyle,
    profileBgStyle, profileBgIcon
  } = req.body;

  // Name colour and emoji status are FairyChat Premium perks (same as
  // Telegram) — enforce server-side too, not just hide the UI, so a
  // free-tier client can't just call the API directly to get them for free.
  if ((nameColor !== undefined || statusEmoji !== undefined) && !req.user.is_premium) {
    return res.status(403).json({ error: 'Name colour and emoji status are FairyChat Premium features' });
  }
  if (appIcon !== undefined && appIcon !== 'default' && !req.user.is_premium) {
    return res.status(403).json({ error: 'Premium app icons are a FairyChat Premium feature' });
  }
  if (badgeStyle !== undefined && !['star', 'verified', 'pink-magic', 'flame', 'fairy-wings', 'fair-icon'].includes(badgeStyle)) {
    return res.status(400).json({ error: 'Unknown badge style' });
  }
  if (badgeStyle !== undefined && badgeStyle !== 'star' && !req.user.is_premium) {
    return res.status(403).json({ error: 'Alternate profile badges are a FairyChat Premium feature' });
  }
  // Profile background colour/gradient + icon pattern — also a FairyChat
  // Premium perk (same as Telegram's Profile Colour), enforced server-side.
  if ((profileBgStyle !== undefined || profileBgIcon !== undefined) && !req.user.is_premium) {
    return res.status(403).json({ error: 'Profile colour is a FairyChat Premium feature' });
  }

  db.prepare(`UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio),
    avatar_color = COALESCE(?, avatar_color),
    birthday = COALESCE(?, birthday), quick_reactions = COALESCE(?, quick_reactions),
    name_color = CASE WHEN ? THEN ? ELSE name_color END,
    status_emoji = CASE WHEN ? THEN ? ELSE status_emoji END,
    app_icon = COALESCE(?, app_icon),
    badge_style = COALESCE(?, badge_style),
    profile_bg_style = CASE WHEN ? THEN ? ELSE profile_bg_style END,
    profile_bg_icon = CASE WHEN ? THEN ? ELSE profile_bg_icon END
    WHERE id = ?`)
    .run(
      name ?? null, bio ?? null, avatarColor ?? null,
      birthday ?? null, Array.isArray(quickReactions) ? JSON.stringify(quickReactions) : null,
      nameColor !== undefined ? 1 : 0, nameColor || null,
      statusEmoji !== undefined ? 1 : 0, statusEmoji || null,
      appIcon ?? null,
      badgeStyle ?? null,
      profileBgStyle !== undefined ? 1 : 0, profileBgStyle || null,
      profileBgIcon !== undefined ? 1 : 0, profileBgIcon || null,
      req.user.id
    );
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: withExtras(updated) });
});

// Changes the account's @username — kept separate from the general PUT
// /me above because it needs its own format + uniqueness validation (same
// rules as registration) and distinct error messages the "Change username"
// menu item can show inline.
router.patch('/me/username', auth, (req, res) => {
  const raw = (req.body.username || '').trim();
  if (raw.length < 3 || !/^[a-zA-Z0-9_]+$/.test(raw)) {
    return res.status(400).json({ error: 'Username must be at least 3 characters (letters, numbers, underscore only)' });
  }
  const username = raw.toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, req.user.id);
  if (existing) return res.status(409).json({ error: 'This username is already taken' });
  db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, req.user.id);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: withExtras(updated) });
});

// Sets a new profile photo — ADDS it to the user's photo history instead of
// overwriting the old one, so the "pull down to browse all your profile
// photos" gallery view has something to swipe through (same as Telegram).
router.post('/me/avatar', auth, (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing photo url' });
  // Animated (GIF/WEBM/APNG) profile pictures are a Premium perk — a
  // <img>/<video> tag will happily play any animated file a non-premium
  // client tries to sneak through, so this has to be enforced here too.
  const isAnimated = /\.(gif|webm|apng)(\?.*)?$/i.test(url);
  if (isAnimated && !req.user.is_premium) {
    return res.status(403).json({ error: 'Animated profile pictures are a FairyChat Premium feature' });
  }
  profileService.addAvatar(req.user.id, url);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: withExtras(updated) });
});

// "Remove Photo" — deletes one profile photo from the gallery (falls back
// to the previous one, or the plain initials avatar if none are left).
router.delete('/me/avatar/:avatarId', auth, (req, res) => {
  try {
    profileService.removeAvatar(req.user.id, req.params.avatarId);
  } catch (e) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'Photo not found' });
    throw e;
  }
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: withExtras(updated) });
});

// --- FairyChat Premium ---

router.get('/me/premium', auth, (req, res) => {
  res.json({ isPremium: !!req.user.is_premium, premiumSince: req.user.premium_since || null });
});

router.post('/me/premium/redeem', auth, (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Enter a code' });
  try {
    premiumService.redeemCode(req.user.id, code);
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ ok: true, user: withExtras(updated) });
  } catch (e) {
    const messages = {
      INVALID_CODE: 'That code is not valid',
      ALREADY_REDEEMED: 'That code has already been used'
    };
    res.status(400).json({ error: messages[e.message] || 'Could not redeem code' });
  }
});

// --- Profile "Posts" (Posts / Archived Posts tabs + the 24h story ring) ---

router.get('/me/posts', auth, (req, res) => {
  const archived = req.query.archived === 'true';
  res.json({ posts: profileService.getPosts(req.user.id, { archived }) });
});

router.post('/me/posts', auth, (req, res) => {
  const { type, fileUrl, fileName, fileSize, caption } = req.body;
  if (!fileUrl) return res.status(400).json({ error: 'Missing file url' });
  const post = profileService.createPost(req.user.id, { type, fileUrl, fileName, fileSize, caption });
  res.json({ post });
});

router.patch('/me/posts/:postId/archive', auth, (req, res) => {
  try {
    const post = profileService.setPostArchived(req.params.postId, req.user.id, req.body.archived !== false);
    res.json({ post });
  } catch (e) {
    res.status(e.message === 'FORBIDDEN' ? 403 : 404).json({ error: 'Could not update post' });
  }
});

router.delete('/me/posts/:postId', auth, (req, res) => {
  try {
    profileService.deletePost(req.params.postId, req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(e.message === 'FORBIDDEN' ? 403 : 404).json({ error: 'Could not delete post' });
  }
});

// --- Two-Step Verification (cloud password) management ---

router.get('/me/two-step', auth, (req, res) => {
  res.json({ enabled: !!req.user.two_step_hash, hint: req.user.two_step_hint || '' });
});

router.post('/me/two-step', auth, async (req, res) => {
  const { currentPassword, newPassword, hint } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Cloud password must be at least 4 characters' });
  }
  if (req.user.two_step_hash) {
    if (!currentPassword) return res.status(400).json({ error: 'Enter your current cloud password to change it' });
    const ok = await bcrypt.compare(currentPassword, req.user.two_step_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect current cloud password' });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET two_step_hash = ?, two_step_hint = ? WHERE id = ?').run(hash, hint || null, req.user.id);
  res.json({ ok: true, enabled: true, hint: hint || '' });
});

router.delete('/me/two-step', auth, async (req, res) => {
  const { password } = req.body;
  if (!req.user.two_step_hash) return res.json({ ok: true, enabled: false });
  if (!password) return res.status(400).json({ error: 'Enter your cloud password to remove it' });
  const ok = await bcrypt.compare(password, req.user.two_step_hash);
  if (!ok) return res.status(401).json({ error: 'Incorrect cloud password' });
  db.prepare('UPDATE users SET two_step_hash = NULL, two_step_hint = NULL WHERE id = ?').run(req.user.id);
  res.json({ ok: true, enabled: false });
});


// Permanent account deletion. This never deletes rows out from under other
// users' chat history — it scrubs every personal field and renames the
// account to "Deleted Account" (exactly like Telegram), scrambles the
// password so nobody can ever log back into it, and drops any saved push
// tokens. All of that user's old messages remain, but the sender now shows
// as "Deleted Account" everywhere (chat lists, bubbles, member lists),
// because those all resolve the display name live from this users row.
router.delete('/me', auth, async (req, res) => {
  const scrambledHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  db.prepare(`UPDATE users SET
      name = 'Deleted Account',
      username = ?,
      phone = NULL,
      bio = '',
      avatar_url = NULL,
      avatar_color = '#6b7385',
      birthday = NULL,
      password_hash = ?,
      status = 'offline',
      deleted = 1
    WHERE id = ?`)
    .run(`deleted_${req.user.id}`, scrambledHash, req.user.id);
  db.prepare('DELETE FROM push_tokens WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// Attaches the "has an active story" ring flag other users' avatars need
// to render it wherever they show up (contacts list, chat list, chat
// header) — cheap enough to compute per-row for this app's scale.
function withStoryFlag(u) {
  return { ...publicUser(u), hasActiveStory: profileService.hasActiveStory(u.id) };
}

router.get('/search', auth, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [] });
  const rows = db.prepare(`SELECT * FROM users WHERE (LOWER(username) LIKE ? OR LOWER(name) LIKE ? OR phone LIKE ?) AND id != ? AND deleted = 0 LIMIT 20`)
    .all(`%${q}%`, `%${q}%`, `%${q}%`, req.user.id);
  res.json({ users: rows.map(withStoryFlag) });
});

router.get('/contacts', auth, (req, res) => {
  const rows = db.prepare(`SELECT u.* FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.owner_id = ? ORDER BY u.name`)
    .all(req.user.id);
  res.json({ contacts: rows.map(withStoryFlag) });
});

// A contact's active stories (the last 24h of their posts) — Telegram-style
// "tap the ringed avatar to view". 403s for anyone who isn't a contact.
router.get('/:userId/stories', auth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.userId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (!profileService.areContacts(req.user.id, target.id)) {
    return res.status(403).json({ error: 'You can only view stories from your contacts' });
  }
  const posts = profileService.getActiveStoryPosts(target.id);
  res.json({ user: publicUser(target), posts });
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

  const candidates = db.prepare('SELECT * FROM users WHERE phone IS NOT NULL AND id != ? AND deleted = 0').all(req.user.id);
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
