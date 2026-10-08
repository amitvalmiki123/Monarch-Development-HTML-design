// FairyChat Premium — Stage 4 Phase 1 (semi-auto UPI flow).
//
// Flow:
//   1. App: POST /order/create {device_id, plan}
//        -> unique code FC-XXXX-XXXX, status=pending_payment
//   2. App opens the user's UPI app (upi://pay?...&tn=CODE) — user pays
//   3. App: POST /order/utr {code, device_id, utr}
//        -> status=pending_verification
//   4. Founder checks UTR in the bank/UPI app, then approves from the
//      admin panel (GET /admin/page) -> status=approved
//   5. App polls GET /order/status -> approved -> premium auto-activates
//      on the device (no code typing for the buyer).
//
// Manual sales / gifts: POST /admin/code/create makes a pre-approved
// unbound code the founder can sell directly; the buyer redeems it via
// POST /redeem in the app.
//
// Storage: SQLite (same DatabaseSync as the rest of this backend).
// Env vars:
//   UPI_ID     — the UPI ID shown for payment (default fairychat@upi)
//   ADMIN_KEY  — key for all /admin endpoints (REQUIRED; else 503)
const express = require('express');
const path = require('path');
const db = require('../db');

const router = express.Router();

const PLANS = {
  monthly: { amount: 99, days: 30, label: '1 Month' },
  yearly: { amount: 599, days: 365, label: '1 Year' },
};
const UPI_ID = process.env.UPI_ID || 'fairychat@upi';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const API_BASE = '/api/fairychat';

// ---------------------------------------------------------------- db table
db.exec(`
CREATE TABLE IF NOT EXISTS fc_premium_orders (
  code TEXT PRIMARY KEY,
  device_id TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL,
  amount_inr INTEGER NOT NULL,
  utr TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  verified_at INTEGER,
  premium_until INTEGER
);
`);

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function randomCode() {
  const seg = () =>
    Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '')
      .padEnd(4, 'X').slice(0, 4);
  return `FC-${seg()}-${seg()}`;
}

function newUniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    const row = db
      .prepare('SELECT code FROM fc_premium_orders WHERE code = ?')
      .get(code);
    if (!row) return code;
  }
  throw new Error('code generation failed');
}

function publicOrder(row) {
  return {
    code: row.code,
    plan: row.plan,
    amount_inr: row.amount_inr,
    status: row.status,
    upi_id: UPI_ID,
    created_at: row.created_at,
    premium_until: row.premium_until,
  };
}

// ------------------------------------------------------------- app routes
// Create an order (called when the buyer taps Buy in the app).
router.post('/order/create', (req, res) => {
  const { device_id, plan } = req.body || {};
  if (!device_id || typeof device_id !== 'string' || device_id.length > 64) {
    return res.status(400).json({ ok: false, error: 'device_id required' });
  }
  const planDef = PLANS[plan];
  if (!planDef) {
    return res.status(400).json({ ok: false, error: 'plan must be monthly|yearly' });
  }
  // Don't let one device stack open orders.
  const open = db
    .prepare(
      "SELECT COUNT(*) AS n FROM fc_premium_orders WHERE device_id = ? AND status IN ('pending_payment','pending_verification')"
    )
    .get(device_id);
  if (open.n >= 3) {
    return res.status(429).json({ ok: false, error: 'too many open orders' });
  }
  const code = newUniqueCode();
  db.prepare(
    'INSERT INTO fc_premium_orders (code, device_id, plan, amount_inr, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(code, device_id, plan, planDef.amount, 'pending_payment', nowSec());
  const row = db.prepare('SELECT * FROM fc_premium_orders WHERE code = ?').get(code);
  res.json({ ok: true, order: publicOrder(row) });
});

// Buyer submits the UPI reference/UTR number after paying.
router.post('/order/utr', (req, res) => {
  const { code, device_id, utr } = req.body || {};
  if (!code || !device_id || !utr) {
    return res.status(400).json({ ok: false, error: 'code, device_id, utr required' });
  }
  const row = db.prepare('SELECT * FROM fc_premium_orders WHERE code = ?').get(code);
  if (!row || row.device_id !== device_id) {
    return res.status(404).json({ ok: false, error: 'order not found' });
  }
  if (row.status === 'approved') {
    return res.json({ ok: true, order: publicOrder(row) });
  }
  if (row.status !== 'pending_payment' && row.status !== 'pending_verification') {
    return res.status(400).json({ ok: false, error: `order is ${row.status}` });
  }
  db.prepare(
    "UPDATE fc_premium_orders SET utr = ?, status = 'pending_verification' WHERE code = ?"
  ).run(String(utr).slice(0, 64), code);
  const updated = db.prepare('SELECT * FROM fc_premium_orders WHERE code = ?').get(code);
  res.json({ ok: true, order: publicOrder(updated) });
});

// App polls this; approved -> premium activates automatically.
router.get('/order/status', (req, res) => {
  const { code, device_id } = req.query;
  if (!code || !device_id) {
    return res.status(400).json({ ok: false, error: 'code, device_id required' });
  }
  const row = db.prepare('SELECT * FROM fc_premium_orders WHERE code = ?').get(code);
  if (!row || (row.device_id !== device_id && row.device_id !== '')) {
    return res.status(404).json({ ok: false, error: 'order not found' });
  }
  res.json({ ok: true, order: publicOrder(row) });
});

// Redeem a pre-approved code (manual sale / gift) or re-activate after
// reinstall. Binds the code to this device once.
router.post('/redeem', (req, res) => {
  const { code, device_id } = req.body || {};
  if (!code || !device_id) {
    return res.status(400).json({ ok: false, error: 'code, device_id required' });
  }
  const row = db.prepare('SELECT * FROM fc_premium_orders WHERE code = ?').get(code);
  if (!row) return res.status(404).json({ ok: false, error: 'invalid code' });
  if (row.status !== 'approved') {
    return res.status(400).json({ ok: false, error: 'code not active yet' });
  }
  if (row.device_id && row.device_id !== device_id) {
    return res.status(403).json({ ok: false, error: 'code already used on another device' });
  }
  const planDef = PLANS[row.plan] || PLANS.monthly;
  const base = Math.max(nowSec(), row.premium_until || 0);
  const until = base + planDef.days * 86400;
  db.prepare(
    'UPDATE fc_premium_orders SET device_id = ?, premium_until = ? WHERE code = ?'
  ).run(device_id, until, code);
  res.json({ ok: true, premium_until: until, plan: row.plan });
});

// ------------------------------------------------------------ admin routes
function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) {
    return res.status(503).json({ ok: false, error: 'ADMIN_KEY env not set on server' });
  }
  const key = req.get('X-Admin-Key') || req.query.key || '';
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ ok: false, error: 'bad admin key' });
  }
  next();
}

// Tiny self-contained admin page (enter key -> approve orders / make codes).
router.get('/admin/page', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'fc-admin.html'));
});

router.get('/admin/orders', requireAdmin, (req, res) => {
  const filter = req.query.filter || 'pending_verification';
  const rows =
    filter === 'all'
      ? db.prepare('SELECT * FROM fc_premium_orders ORDER BY created_at DESC LIMIT 200').all()
      : db
          .prepare('SELECT * FROM fc_premium_orders WHERE status = ? ORDER BY created_at DESC LIMIT 200')
          .all(filter);
  res.json({ ok: true, orders: rows });
});

router.post('/admin/approve', requireAdmin, (req, res) => {
  const { code } = req.body || {};
  const row = code && db.prepare('SELECT * FROM fc_premium_orders WHERE code = ?').get(code);
  if (!row) return res.status(404).json({ ok: false, error: 'order not found' });
  const planDef = PLANS[row.plan] || PLANS.monthly;
  const base = Math.max(nowSec(), row.premium_until || 0);
  db.prepare(
    "UPDATE fc_premium_orders SET status = 'approved', verified_at = ?, premium_until = ? WHERE code = ?"
  ).run(nowSec(), base + planDef.days * 86400, code);
  res.json({ ok: true });
});

router.post('/admin/reject', requireAdmin, (req, res) => {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ ok: false, error: 'code required' });
  db.prepare("UPDATE fc_premium_orders SET status = 'rejected' WHERE code = ?").run(code);
  res.json({ ok: true });
});

// Make a pre-approved, unbound code (for direct sales / gifts).
router.post('/admin/code/create', requireAdmin, (req, res) => {
  const plan = (req.body && req.body.plan) || 'monthly';
  const planDef = PLANS[plan];
  if (!planDef) return res.status(400).json({ ok: false, error: 'plan must be monthly|yearly' });
  const code = newUniqueCode();
  db.prepare(
    "INSERT INTO fc_premium_orders (code, device_id, plan, amount_inr, status, created_at, premium_until) VALUES (?, '', ?, ?, 'approved', ?, 0)"
  ).run(code, plan, planDef.amount, nowSec());
  res.json({ ok: true, code, plan, amount_inr: planDef.amount });
});

module.exports = router;
