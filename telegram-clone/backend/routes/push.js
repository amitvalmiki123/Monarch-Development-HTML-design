const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { id } = require('../utils');
// firebase-admin v12+ (we're on v14) reworked its CommonJS default export to
// a lean shim (initializeApp/getApp/getApps/cert/applicationDefault only) —
// the old admin.apps / admin.credential.cert / admin.messaging() namespaced
// API from v8-v11 no longer exists on it. Use the modular submodule imports
// instead, which is the correct, current API.
const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const router = express.Router();

// Explicitly routes every push at the same high-importance Android
// notification channel ("messages") the app creates at runtime (see
// frontend utils/notifications.js) — without this, Android/FCM silently
// posts background/killed-app notifications to its own hidden low-priority
// "Miscellaneous" channel, which can suppress the heads-up popup and sound
// even though the notification technically "arrived".
function androidConfig() {
  return {
    priority: 'high',
    notification: {
      channelId: 'messages',
      icon: 'ic_stat_notify',
      color: '#d9b64c',
      sound: 'default',
      defaultSound: true,
      priority: 'max',
      visibility: 'public'
    }
  };
}

// Full background push (delivered even after the app is fully closed/
// killed) needs a real Firebase Cloud Messaging project:
//   1. Create a free project at https://console.firebase.google.com
//   2. Add an Android app with package name "com.monarch.chat", download
//      google-services.json, and place it at
//      telegram-clone/frontend/android/app/google-services.json
//   3. In Project Settings -> Service accounts, generate a new private key
//      (JSON) for the Admin SDK and set it as the FIREBASE_SERVICE_ACCOUNT
//      environment variable on the backend (paste the whole JSON as one line).
// Until that's done, everything below safely no-ops: tokens are stored (in
// case you configure Firebase later) but nothing ever tries to send a real
// push, and the app never even asks the device to register for one.
let app = null;
let firebaseReady = false;
let lastInitError = null;

function getFirebaseApp() {
  if (firebaseReady) return app;
  firebaseReady = true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    lastInitError = 'FIREBASE_SERVICE_ACCOUNT environment variable is not set';
    return null;
  }
  try {
    const existing = getApps();
    app = existing.length ? getApp() : initializeApp({ credential: cert(JSON.parse(raw)) });
    lastInitError = null;
    return app;
  } catch (e) {
    lastInitError = e.message;
    console.error('Firebase Admin init failed — push notifications disabled:', e.message);
    app = null;
    return null;
  }
}

// Reports whether push is *actually* working server-side, not just whether
// the env var string is non-empty — this is what the Settings diagnostics
// screen calls to tell you exactly why push isn't going out, without needing
// server log access.
router.get('/config', auth, (req, res) => {
  const fbApp = getFirebaseApp();
  const tokenCount = db.prepare('SELECT COUNT(*) as c FROM push_tokens WHERE user_id = ?').get(req.user.id).c;
  res.json({ enabled: !!fbApp, error: fbApp ? null : lastInitError, myTokenCount: tokenCount });
});

router.post('/register-token', auth, (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  db.prepare('INSERT OR IGNORE INTO push_tokens (id, user_id, token, platform, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id(), req.user.id, token, platform || 'android', Date.now());
  res.json({ ok: true });
});

// Lets the logged-in user fire a real push at their own registered
// device(s), for end-to-end debugging straight from Settings — no second
// account or waiting for someone else to message you required.
router.post('/test', auth, async (req, res) => {
  const fbApp = getFirebaseApp();
  if (!fbApp) return res.status(400).json({ error: lastInitError || 'Firebase is not configured on this server' });
  const tokens = db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(req.user.id).map((r) => r.token);
  if (tokens.length === 0) return res.status(400).json({ error: 'No device is registered for push yet — open the app once with notifications permission granted, then try again' });
  try {
    const resp = await getMessaging(fbApp).sendEachForMulticast({
      tokens,
      notification: { title: 'FairyChat', body: 'Test push notification — if you see this, it works!' },
      android: androidConfig(),
      data: { chatId: 'test' }
    });
    const errors = (resp.responses || []).filter((r) => !r.success).map((r) => r.error?.message || 'unknown error');
    res.json({ sent: resp.successCount, failed: resp.failureCount, errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Called from the socket layer whenever a message is sent, for every member
// who isn't the sender — a genuine no-op unless Firebase is configured.
async function sendPushToUser(userId, { title, body, chatId }) {
  const fbApp = getFirebaseApp();
  if (!fbApp) return;
  const tokens = db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(userId).map((r) => r.token);
  if (tokens.length === 0) return;
  try {
    const resp = await getMessaging(fbApp).sendEachForMulticast({
      tokens,
      notification: { title, body },
      android: androidConfig(),
      data: { chatId: String(chatId) }
    });
    (resp.responses || []).forEach((r, idx) => {
      if (!r.success && /registration-token-not-registered/.test(r.error?.code || '')) {
        db.prepare('DELETE FROM push_tokens WHERE token = ?').run(tokens[idx]);
      }
    });
  } catch (e) {
    console.error('Push send failed:', e.message);
  }
}

module.exports = router;
module.exports.sendPushToUser = sendPushToUser;
