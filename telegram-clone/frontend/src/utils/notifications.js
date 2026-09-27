import { Capacitor } from '@capacitor/core';

let channelsReady = false;
let webPermissionAsked = false;
let notifIdCounter = 1;
let pushListenersAttached = false;
let registrationWatchdog = null;

// --- Per-chat notification grouping (WhatsApp/Telegram-style) --------------
// Previously every incoming message got its own ever-incrementing
// notification `id`, so sending e.g. 4 messages in a row popped up 4
// separate notification banners instead of one updating banner like every
// other chat app does. Fix: derive a STABLE id from the chat id (so
// scheduling again with the same id replaces/updates the existing tray
// entry instead of stacking a new one) and buffer the recent message bodies
// per chat so the notification can show "N new messages" plus an inbox-style
// list of the last few, exactly like WhatsApp/Telegram.
const chatNotifBuffers = new Map(); // chatId -> { bodies: string[], title: string }

function stableIdFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0; // 32-bit signed overflow, intentional
  }
  // Keep well inside the signed 32-bit range Android notification ids need,
  // and offset it away from the small counter values sendLocalTestNotification
  // / notifyNewMessage's non-grouped callers use, so they never collide.
  return 100000 + (Math.abs(hash) % 1000000000);
}

// Call when the user actually opens a chat — clears the buffered message
// count/preview for it and cancels any notification currently showing for
// it, so re-opening the tray after reading the chat doesn't show a stale
// "3 new messages" banner for messages already seen in-app.
export async function clearMessageNotifications(chatId) {
  if (!chatNotifBuffers.has(chatId)) return;
  chatNotifBuffers.delete(chatId);
  try {
    if (Capacitor.isNativePlatform()) {
      await ensureLocalNotifications();
      const LocalNotifications = localNotifPlugin;
      await LocalNotifications.cancel({ notifications: [{ id: stableIdFromString(`chat:${chatId}`) }] });
    }
  } catch {
    // best-effort — not finding/cancelling an already-gone notification is fine
  }
}

// Schedules (or updates) the single grouped notification for one chat.
// Every call for the same chatId replaces the previous banner rather than
// stacking a new one, and the body/inbox list reflects everything buffered
// since the chat was last opened.
async function scheduleGroupedNotification({ chatId, title, body, channelId, smallIcon }) {
  const entry = chatNotifBuffers.get(chatId) || { bodies: [], title };
  entry.title = title; // keep the latest sender/chat name
  entry.bodies.push(body);
  if (entry.bodies.length > 5) entry.bodies = entry.bodies.slice(-5);
  chatNotifBuffers.set(chatId, entry);

  const count = entry.bodies.length;
  const displayBody = count === 1 ? entry.bodies[0] : `${count} new messages`;

  await ensureLocalNotifications();
  const LocalNotifications = localNotifPlugin;
  await LocalNotifications.schedule({
    notifications: [{
      id: stableIdFromString(`chat:${chatId}`),
      title,
      body: displayBody,
      // inboxList/summaryText only kick in visually once there's more than
      // one line to show — harmless to always pass them.
      inboxList: entry.bodies,
      summaryText: count > 1 ? title : undefined,
      channelId,
      smallIcon,
      extra: { chatId }
    }]
  });
}

// Android can only have ONE permission-request dialog in flight at a time.
// initNotifications() and registerPushIfConfigured() both request the same
// underlying POST_NOTIFICATIONS permission (via two different Capacitor
// plugins) — calling them concurrently from more than one place (e.g. the
// app boot flow and the Settings troubleshoot screen both mounting around
// the same time) causes the second plugin's callback to be silently
// dropped, so registration hangs forever with no token and no error. This
// tiny queue forces every call through here to run strictly one after
// another, no matter who calls it or when.
let permissionQueue = Promise.resolve();
function serialized(fn) {
  const run = permissionQueue.then(fn, fn);
  permissionQueue = run.catch(() => {});
  return run;
}

// A handful of real-device Capacitor plugin calls (permission dialogs,
// register()) are known to sometimes never call back at all — no result,
// no error, nothing (see ionic-team/capacitor-plugins issues on
// PushNotifications.register()). Without this, one such hang would freeze
// `permissionQueue` forever, which in turn freezes *every* later call
// through `serialized()` — including the Settings > Troubleshoot screen and
// the "Send real push test" button — with the UI stuck on "checking…" /
// "not yet" forever and no way to recover short of... nothing, there was no
// way to recover. Racing every native call against a timeout guarantees
// this function always settles, so the queue (and the UI) can never wedge.
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}


// --- User-facing preferences (Settings > Notifications) --------------------
const PREFS_KEY = 'fairychat_notif_prefs';
const DEFAULT_PREFS = { messages: true, groups: true, sound: true };

export function getNotifPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setNotifPrefs(patch) {
  const next = { ...getNotifPrefs(), ...patch };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  return next;
}

// --- Diagnostics status, for troubleshooting only ---------------------------
// Shared status the Settings -> Notifications -> "Troubleshoot" screen reads,
// so you (and I) can see exactly which step failed without needing adb
// logcat or server log access. `subscribeStatus` lets a component re-render
// live as async native events (registration success/failure) come in,
// instead of only reflecting a one-time snapshot.
export const pushStatus = {
  isNative: Capacitor.isNativePlatform(),
  localPermission: 'unknown', // 'granted' | 'denied' | 'prompt' | 'unknown'
  serverEnabled: null, // null = not checked yet
  serverError: null,
  tokenRegistered: false,
  registering: false,
  lastError: null,
  log: [] // plain-English, timestamped trace of every step — see logStep()
};

const statusListeners = new Set();
export function subscribeStatus(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}
function emitStatus() {
  statusListeners.forEach((cb) => {
    try { cb({ ...pushStatus }); } catch { /* ignore */ }
  });
}

// Every step of the init/registration flow calls this. It's the one thing
// that lets a real failure on a real device be diagnosed from a single
// screenshot/paste of Settings > Troubleshoot instead of needing adb/logcat
// access — several past "fixes" here were guesses because nothing recorded
// *which exact line* a device got stuck or errored on.
function logStep(msg) {
  const line = `${new Date().toISOString().slice(11, 23)}  ${msg}`;
  pushStatus.log = [...pushStatus.log.slice(-59), line];
  emitStatus();
}
logStep(`Module loaded. isNativePlatform=${pushStatus.isNative}, userAgent=${typeof navigator !== 'undefined' ? navigator.userAgent : 'n/a'}`);

// Catches an otherwise totally invisible failure mode: some unrelated JS
// error/rejection elsewhere in the app silently breaks things and the
// Troubleshoot screen just looks "stuck" with no clue why. This surfaces it
// in the same log instead of it only ever showing up in a browser devtools
// console nobody on a real phone can see.
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => logStep(`window error: ${e.message} (${e.filename}:${e.lineno})`));
  window.addEventListener('unhandledrejection', (e) => logStep(`unhandled promise rejection: ${e.reason?.message || e.reason}`));
}

// IMPORTANT: never let a Promise resolve *with the raw plugin object itself*
// as its value (e.g. `async function f() { return LocalNotifications; }`,
// or `Promise.resolve(LocalNotifications)`). Capacitor's plugin object is a
// Proxy that bridges *every* property access to a native call — including
// "then". When a Promise resolves to a value, the JS engine checks whether
// that value looks like a thenable (has a `.then` function) and, if so,
// calls `.then()` on it to adopt its state. Doing that on a Capacitor plugin
// proxy makes it try to bridge a native call literally named "then", which
// obviously doesn't exist, producing the exact
// `"LocalNotifications.then()" is not implemented on android` crash — this
// was happening on *every single device*, on the very first plugin call,
// which is why local + push notifications have never actually worked here.
// The fix: keep the plugin reference in a plain module-scope variable that's
// read directly (never returned through a Promise/async-function boundary),
// and only ever await the *result of calling a real method* on it (which is
// a genuine native-bridged Promise, safe to await normally).
let localNotifPlugin = null;
let localNotifImportPromise = null;
function ensureLocalNotifications() {
  if (localNotifPlugin) return Promise.resolve();
  if (!localNotifImportPromise) {
    logStep('Importing @capacitor/local-notifications…');
    localNotifImportPromise = import('@capacitor/local-notifications').then((mod) => {
      localNotifPlugin = mod.LocalNotifications;
      logStep('Imported @capacitor/local-notifications OK');
    });
  }
  return localNotifImportPromise;
}

let pushNotifPlugin = null;
let pushNotifImportPromise = null;
function ensurePushNotifications() {
  if (pushNotifPlugin) return Promise.resolve();
  if (!pushNotifImportPromise) {
    logStep('Importing @capacitor/push-notifications…');
    pushNotifImportPromise = import('@capacitor/push-notifications').then((mod) => {
      pushNotifPlugin = mod.PushNotifications;
      logStep('Imported @capacitor/push-notifications OK');
    });
  }
  return pushNotifImportPromise;
}

// Sets up whatever's needed so `notifyNewMessage` can fire immediately:
// - Native (Android/iOS via Capacitor): local-notification permission + two
//   Android notification channels (with/without sound — Android locks a
//   channel's sound once created, so the "Sound" preference switches which
//   channel a notification goes to rather than a per-notification flag).
// - Web/PWA: the standard browser Notification permission.
export async function initNotifications() {
  return serialized(() => initNotificationsImpl());
}

async function initNotificationsImpl() {
  logStep('initNotifications: start');
  try {
    if (Capacitor.isNativePlatform()) {
      await ensureLocalNotifications();
      const LocalNotifications = localNotifPlugin;
      logStep('Calling LocalNotifications.checkPermissions()…');
      let perm = await withTimeout(LocalNotifications.checkPermissions(), 8000, 'checkPermissions() did not respond in 8s');
      logStep(`checkPermissions() -> display=${perm.display}`);
      if (perm.display !== 'granted') {
        logStep('Calling LocalNotifications.requestPermissions()…');
        perm = await withTimeout(LocalNotifications.requestPermissions(), 15000, 'requestPermissions() did not respond in 15s — the permission dialog may not have appeared');
        logStep(`requestPermissions() -> display=${perm.display}`);
      }
      pushStatus.localPermission = perm.display;
      if (!channelsReady) {
        logStep('Creating notification channels…');
        // IMPORTANT: don't pass sound: 'default' — Capacitor's Android channel
        // code treats *any* non-empty sound string as a raw-resource filename
        // (res/raw/<name>.*) and builds a URI for it with zero existence
        // check. "default" doesn't match a real bundled file, so the channel
        // silently got a sound URI that points at nothing — vibration still
        // worked (it's a separate flag) but no sound ever played, on every
        // device. Simply omitting `sound` here leaves Android's own
        // NotificationChannel constructor default in place, which *is*
        // already the system default notification sound.
        // Also bumping the channel id to *_v2: Android permanently locks a
        // channel's settings the first time it's created — any device that
        // already ran the old broken version has a permanently-silent
        // "messages" channel sitting in its system settings that no future
        // app update can fix in place. A new id starts clean.
        await withTimeout(LocalNotifications.createChannel({
          id: 'messages_v2',
          name: 'Messages',
          description: 'New chat messages',
          importance: 4,
          visibility: 1,
          vibration: true
        }), 5000, 'createChannel timed out').catch((e) => logStep(`createChannel(messages_v2) failed: ${e.message}`));
        // Genuinely silent: importance LOW (2) is what actually suppresses
        // both sound and the heads-up popup on Android — omitting `sound`
        // alone is not enough, since (per the same bug above) an unset sound
        // still resolves to the system default at HIGH/DEFAULT importance.
        await withTimeout(LocalNotifications.createChannel({
          id: 'messages_silent_v2',
          name: 'Messages (silent)',
          description: 'New chat messages without sound',
          importance: 2,
          visibility: 1,
          vibration: false
        }), 5000, 'createChannel timed out').catch((e) => logStep(`createChannel(messages_silent_v2) failed: ${e.message}`));
        channelsReady = true;
        logStep('Notification channels ready');
      }
    } else if ('Notification' in window) {
      if (!webPermissionAsked && Notification.permission === 'default') {
        webPermissionAsked = true;
        await Notification.requestPermission();
      }
      pushStatus.localPermission = Notification.permission === 'granted' ? 'granted' : Notification.permission;
    }
    logStep('initNotifications: done');
  } catch (e) {
    logStep(`initNotifications: ERROR — ${e.message}`);
    pushStatus.lastError = e.message;
  }
  emitStatus();
}


// Fires an immediate local notification for a newly-arrived message. Safe to
// call unconditionally; every branch is best-effort and swallows errors.
// Respects the user's Settings > Notifications preferences.
export async function notifyNewMessage({ title, body, chatId, isGroup = false }) {
  const prefs = getNotifPrefs();
  if (!prefs.messages) return;
  if (isGroup && !prefs.groups) return;
  try {
    if (Capacitor.isNativePlatform()) {
      await scheduleGroupedNotification({
        chatId,
        title,
        body,
        channelId: prefs.sound ? 'messages_v2' : 'messages_silent_v2',
        smallIcon: 'ic_stat_notify'
      });
    } else if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      new Notification(title, { body, tag: `chat-${chatId}`, silent: !prefs.sound });
    }
  } catch (e) {
    pushStatus.lastError = e.message;
    emitStatus();
  }
}

// Fire a local notification right now, independent of any backend/socket and
// ignoring the on/off preference — isolates whether permission + the Android
// notification channel/icon setup works at all, from the troubleshoot panel.
export async function sendLocalTestNotification() {
  logStep('sendLocalTestNotification: start');
  await initNotifications();
  const prefs = getNotifPrefs();
  try {
    if (Capacitor.isNativePlatform()) {
      await ensureLocalNotifications();
      const LocalNotifications = localNotifPlugin;
      logStep('Scheduling local test notification…');
      await withTimeout(LocalNotifications.schedule({
        notifications: [{
          id: notifIdCounter++,
          title: 'FairyChat',
          body: 'Local test notification — if you see this, local alerts work!',
          channelId: prefs.sound ? 'messages_v2' : 'messages_silent_v2',
          smallIcon: 'ic_stat_notify'
        }]
      }), 8000, 'schedule() did not respond in 8s');
      logStep('schedule() returned OK — check the notification tray now');
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FairyChat', { body: 'Local test notification — if you see this, local alerts work!' });
    }
  } catch (e) {
    logStep(`sendLocalTestNotification: ERROR — ${e.message}`);
    pushStatus.lastError = e.message;
    emitStatus();
    throw e;
  }
}

// Full "push even when the app is fully closed/killed" support needs a real
// Firebase Cloud Messaging project (google-services.json on the Android
// side + a service-account key on the backend). Until those credentials
// are provided, /api/push/config reports { enabled: false } and this is a
// safe no-op — nothing here ever touches native Firebase code unless the
// backend confirms it's actually configured.
export async function registerPushIfConfigured(http) {
  return serialized(() => registerPushIfConfiguredImpl(http));
}

async function registerPushIfConfiguredImpl(http) {
  logStep('registerPushIfConfigured: start');
  try {
    if (!Capacitor.isNativePlatform()) { logStep('Not a native platform — skipping push registration entirely'); return; }
    let data;
    try {
      logStep('GET /push/config…');
      const res = await withTimeout(http.get('/push/config'), 20000, 'Could not reach the server to check push config (timed out)');
      data = res.data;
      logStep(`/push/config -> ${JSON.stringify(data)}`);
    } catch (e) {
      logStep(`/push/config FAILED: ${e.message}`);
      pushStatus.serverEnabled = false;
      pushStatus.serverError = e.message;
      emitStatus();
      return;
    }
    pushStatus.serverEnabled = !!data?.enabled;
    pushStatus.serverError = data?.error || null;
    emitStatus();
    if (!data?.enabled) { logStep('Server reports push not configured — stopping here'); return; }

    await ensurePushNotifications();
    const PushNotifications = pushNotifPlugin;
    logStep('Calling PushNotifications.checkPermissions()…');
    let perm = await withTimeout(PushNotifications.checkPermissions(), 8000, 'checkPermissions() did not respond in 8s');
    logStep(`checkPermissions() -> receive=${perm.receive}`);
    if (perm.receive !== 'granted') {
      logStep('Calling PushNotifications.requestPermissions()…');
      perm = await withTimeout(PushNotifications.requestPermissions(), 15000, 'requestPermissions() did not respond in 15s — the permission dialog may not have appeared');
      logStep(`requestPermissions() -> receive=${perm.receive}`);
    }
    if (perm.receive !== 'granted') {
      logStep('Permission not granted — stopping here');
      pushStatus.lastError = 'Notification permission was not granted';
      emitStatus();
      return;
    }

    if (!pushListenersAttached) {
      pushListenersAttached = true;
      logStep('Attaching registration/registrationError/pushNotificationReceived listeners');
      PushNotifications.addListener('registration', (token) => {
        logStep(`'registration' event fired — token starts with ${String(token.value).slice(0, 12)}…`);
        pushStatus.tokenRegistered = true;
        pushStatus.registering = false;
        pushStatus.lastError = null;
        if (registrationWatchdog) { clearTimeout(registrationWatchdog); registrationWatchdog = null; }
        emitStatus();
        http.post('/push/register-token', { token: token.value, platform: 'android' })
          .then(() => logStep('Token saved to server OK'))
          .catch((e) => { logStep(`Saving token to server FAILED: ${e.message}`); pushStatus.lastError = `Token registered on device but saving to server failed: ${e.message}`; emitStatus(); });
      });
      PushNotifications.addListener('registrationError', (err) => {
        logStep(`'registrationError' event fired: ${err?.error || JSON.stringify(err)}`);
        pushStatus.registering = false;
        pushStatus.lastError = `Registration error: ${err?.error || JSON.stringify(err)}`;
        if (registrationWatchdog) { clearTimeout(registrationWatchdog); registrationWatchdog = null; }
        emitStatus();
      });
      // Android does not auto-show a system-tray notification for a push
      // that arrives while the app is in the foreground — show it manually
      // via a local notification so foreground behaves the same as
      // background/closed.
      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        const prefs = getNotifPrefs();
        if (!prefs.messages) return;
        const chatId = notification.data?.chatId || notification.data?.chat_id || `push-${notification.title || 'unknown'}`;
        scheduleGroupedNotification({
          chatId,
          title: notification.title || 'FairyChat',
          body: notification.body || 'New message',
          channelId: prefs.sound ? 'messages_v2' : 'messages_silent_v2',
          smallIcon: 'ic_stat_notify'
        }).catch(() => {});
      });
    }

    pushStatus.registering = true;
    emitStatus();

    // register() only *asks the OS* to start the process — the actual
    // token/error arrives later via the listeners above, not from this
    // call's own promise. Arm the watchdog BEFORE calling register(), not
    // after: on some devices register() itself never resolves at all (a
    // known Capacitor/Play-Services bug), and if the watchdog were armed
    // only after a completed await, that bug would skip the watchdog
    // entirely and hang this whole function (and the shared queue behind
    // it) forever instead of surfacing an error after 12s.
    if (registrationWatchdog) clearTimeout(registrationWatchdog);
    registrationWatchdog = setTimeout(() => {
      if (!pushStatus.tokenRegistered) {
        logStep('Watchdog: no registration/registrationError event within 12s');
        pushStatus.registering = false;
        pushStatus.lastError = 'No response after 12s. This usually means Google Play Services is missing, disabled, or out of date on this device.';
        emitStatus();
      }
    }, 12000);

    // register() is expected to resolve almost instantly; if it doesn't,
    // don't let it block the shared init queue — the watchdog above already
    // covers surfacing "stuck" to the user.
    logStep('Calling PushNotifications.register()…');
    await withTimeout(PushNotifications.register(), 10000, 'register() call did not return in 10s').then(
      () => logStep('register() call returned OK (still waiting for registration/registrationError event)'),
      (e) => { logStep(`register() call itself failed/timed out: ${e.message}`); pushStatus.lastError = e.message; emitStatus(); }
    );
    logStep('registerPushIfConfigured: function body finished (listeners may still fire later)');
  } catch (e) {
    logStep(`registerPushIfConfigured: ERROR — ${e.message}`);
    pushStatus.registering = false;
    pushStatus.lastError = e.message;
    emitStatus();
  }
}

// Asks the backend to send a real push to every device this account has
// registered — the full end-to-end test, straight from Settings.
export async function sendServerTestPush(http) {
  logStep('sendServerTestPush: POST /push/test…');
  try {
    const { data } = await http.post('/push/test');
    logStep(`/push/test -> ${JSON.stringify(data)}`);
    return data;
  } catch (e) {
    logStep(`/push/test FAILED: ${e.response?.data?.error || e.message}`);
    throw e;
  }
}
