const jwt = require('jsonwebtoken');
const { customAlphabet } = require('nanoid');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 14);

const PALETTE = [
  '#7C4DFF', '#B08D57', '#5E35B1', '#D4AF37', '#8E63CE',
  '#C9A227', '#6A3FB5', '#E0B23A', '#9C6ADE', '#B8860B'
];

function id() {
  return nanoid();
}

function pickColor(seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function signToken(user, sessionId) {
  return jwt.sign({ uid: user.id, username: user.username, sid: sessionId }, JWT_SECRET, { expiresIn: '30d' });
}

// Issued right after a correct password when the account also has
// Two-Step Verification enabled — proves "you know the account password"
// without yet granting a real session, until the cloud password is also
// verified via /auth/two-step. Short-lived and carries no session id.
function signPendingTwoStepToken(user) {
  return jwt.sign({ uid: user.id, pending2fa: true }, JWT_SECRET, { expiresIn: '10m' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    phone: u.phone,
    name: u.name,
    bio: u.bio,
    avatarColor: u.avatar_color,
    avatarUrl: u.avatar_url || null,
    birthday: u.birthday || null,
    quickReactions: (() => { try { return JSON.parse(u.quick_reactions || '[]'); } catch { return []; } })(),
    status: u.status,
    lastSeen: u.last_seen,
    deleted: !!u.deleted,
    // FairyChat Premium flair — visible on everyone's profile/messages the
    // same way Telegram shows a contact's badge/status/name-colour to you,
    // not just to the premium user themselves.
    isPremium: !!u.is_premium,
    nameColor: u.name_color || null,
    statusEmoji: u.status_emoji || null,
    badgeStyle: u.badge_style || 'star'
  };
}

// Phone numbers typed at signup and phone numbers read from a device's
// contact book rarely share the same formatting (spaces, dashes, country
// code prefix). Comparing the last 10 digits is a pragmatic way to match
// "+91 98765 43210", "9876543210" and "098-765-43210" as the same number.
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 6) return null;
  return digits.slice(-10);
}

module.exports = { id, pickColor, signToken, signPendingTwoStepToken, verifyToken, publicUser, normalizePhone, JWT_SECRET };
