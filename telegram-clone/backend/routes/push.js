const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { id } = require('../utils');

const router = express.Router();

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
let admin = null;
let firebaseReady = false;
function getFirebaseAdmin() {
  if (firebaseReady) return admin;
  firebaseReady = true;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    }
    return admin;
  } catch (e) {
    console.error('Firebase Admin init failed — push notifications disabled:', e.message);
    admin = null;
    return null;
  }
}

router.get('/config', auth, (req, res) => {
  res.json({ enabled: !!process.env.FIREBASE_SERVICE_ACCOUNT });
});

router.post('/register-token', auth, (req, res) => {
  const { token, platform } = req.body;
  if (!token) return res.status(400).json({ error: 'token is required' });
  db.prepare('INSERT OR IGNORE INTO push_tokens (id, user_id, token, platform, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id(), req.user.id, token, platform || 'android', Date.now());
  res.json({ ok: true });
});

// Called from the socket layer whenever a message is sent, for every member
// who isn't the sender — a genuine no-op unless Firebase is configured.
async function sendPushToUser(userId, { title, body, chatId }) {
  const fbAdmin = getFirebaseAdmin();
  if (!fbAdmin) return;
  const tokens = db.prepare('SELECT token FROM push_tokens WHERE user_id = ?').all(userId).map((r) => r.token);
  if (tokens.length === 0) return;
  try {
    const resp = await fbAdmin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
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
