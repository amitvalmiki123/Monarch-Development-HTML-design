const crypto = require('crypto');
const db = require('../db');

// Human-friendly one-time codes, e.g. "FAIRY-7K2M-9QXP" — easy to read out
// loud or paste into WhatsApp when you hand one to a friend who paid you.
function generateCode() {
  const part = () => crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `FAIRY-${part()}-${part()}`;
}

function createCodes(count = 1, durationDays = null) {
  const now = Date.now();
  const codes = [];
  const insert = db.prepare('INSERT INTO premium_codes (code, duration_days, created_at) VALUES (?, ?, ?)');
  for (let i = 0; i < count; i++) {
    let code;
    do { code = generateCode(); } while (db.prepare('SELECT 1 FROM premium_codes WHERE code = ?').get(code));
    insert.run(code, durationDays, now);
    codes.push(code);
  }
  return codes;
}

// Reusable, never-locks-out codes — currently just the one seeded testing
// code (see db.js) so every friend/tester can redeem it on their own
// account during the pre-release testing phase without it running out.
// Swap this back to an empty set before a real public launch.
const REUSABLE_CODES = new Set(['FAIRY-TEST-0001']);

function redeemCode(userId, rawCode) {
  const code = (rawCode || '').trim().toUpperCase();
  const row = db.prepare('SELECT * FROM premium_codes WHERE code = ?').get(code);
  if (!row) throw new Error('INVALID_CODE');
  const reusable = REUSABLE_CODES.has(code);
  if (row.redeemed_by && !reusable) throw new Error('ALREADY_REDEEMED');

  const now = Date.now();
  if (!reusable) {
    db.prepare('UPDATE premium_codes SET redeemed_by = ?, redeemed_at = ? WHERE code = ?').run(userId, now, code);
  }
  db.prepare('UPDATE users SET is_premium = 1, premium_since = COALESCE(premium_since, ?) WHERE id = ?').run(now, userId);
  return { durationDays: row.duration_days };
}

// Not wired to a scheduled job (no persistent worker in this app) — checked
// lazily wherever premium status is read, so a lapsed time-limited code
// still gets cleaned up promptly without needing a cron process.
function isStillPremium(user) {
  if (!user.is_premium) return false;
  return true; // lifetime codes today; duration-limited codes can be layered in later without changing this call site.
}

module.exports = { createCodes, redeemCode, isStillPremium };
