import { Capacitor } from '@capacitor/core';

let localNotifModule = null;
let pushNotifModule = null;
let channelsReady = false;
let webPermissionAsked = false;
let notifIdCounter = 1;
let pushListenersAttached = false;
let registrationWatchdog = null;

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
  lastError: null
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

async function getLocalNotifications() {
  if (!localNotifModule) localNotifModule = await import('@capacitor/local-notifications');
  return localNotifModule.LocalNotifications;
}

async function getPushNotifications() {
  if (!pushNotifModule) pushNotifModule = await import('@capacitor/push-notifications');
  return pushNotifModule.PushNotifications;
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
  try {
    if (Capacitor.isNativePlatform()) {
      const LocalNotifications = await getLocalNotifications();
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
      pushStatus.localPermission = perm.display;
      if (!channelsReady) {
        await LocalNotifications.createChannel({
          id: 'messages',
          name: 'Messages',
          description: 'New chat messages',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true
        }).catch(() => {});
        await LocalNotifications.createChannel({
          id: 'messages_silent',
          name: 'Messages (silent)',
          description: 'New chat messages without sound',
          importance: 4,
          visibility: 1,
          vibration: false
        }).catch(() => {});
        channelsReady = true;
      }
    } else if ('Notification' in window) {
      if (!webPermissionAsked && Notification.permission === 'default') {
        webPermissionAsked = true;
        await Notification.requestPermission();
      }
      pushStatus.localPermission = Notification.permission === 'granted' ? 'granted' : Notification.permission;
    }
  } catch (e) {
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
      const LocalNotifications = await getLocalNotifications();
      await LocalNotifications.schedule({
        notifications: [{
          id: notifIdCounter++,
          title,
          body,
          channelId: prefs.sound ? 'messages' : 'messages_silent',
          smallIcon: 'ic_stat_notify',
          extra: { chatId }
        }]
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
  await initNotifications();
  const prefs = getNotifPrefs();
  try {
    if (Capacitor.isNativePlatform()) {
      const LocalNotifications = await getLocalNotifications();
      await LocalNotifications.schedule({
        notifications: [{
          id: notifIdCounter++,
          title: 'FairyChat',
          body: 'Local test notification — if you see this, local alerts work!',
          channelId: prefs.sound ? 'messages' : 'messages_silent',
          smallIcon: 'ic_stat_notify'
        }]
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FairyChat', { body: 'Local test notification — if you see this, local alerts work!' });
    }
  } catch (e) {
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
  try {
    if (!Capacitor.isNativePlatform()) return;
    const { data } = await http.get('/push/config');
    pushStatus.serverEnabled = !!data?.enabled;
    pushStatus.serverError = data?.error || null;
    emitStatus();
    if (!data?.enabled) return;

    const PushNotifications = await getPushNotifications();
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      pushStatus.lastError = 'Notification permission was not granted';
      emitStatus();
      return;
    }

    if (!pushListenersAttached) {
      pushListenersAttached = true;
      PushNotifications.addListener('registration', (token) => {
        pushStatus.tokenRegistered = true;
        pushStatus.registering = false;
        pushStatus.lastError = null;
        if (registrationWatchdog) { clearTimeout(registrationWatchdog); registrationWatchdog = null; }
        emitStatus();
        http.post('/push/register-token', { token: token.value, platform: 'android' })
          .catch((e) => { pushStatus.lastError = `Token registered on device but saving to server failed: ${e.message}`; emitStatus(); });
      });
      PushNotifications.addListener('registrationError', (err) => {
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
        const LocalNotifications = await getLocalNotifications();
        LocalNotifications.schedule({
          notifications: [{
            id: notifIdCounter++,
            title: notification.title || 'FairyChat',
            body: notification.body || 'New message',
            channelId: prefs.sound ? 'messages' : 'messages_silent',
            smallIcon: 'ic_stat_notify'
          }]
        }).catch(() => {});
      });
    }

    pushStatus.registering = true;
    emitStatus();
    await PushNotifications.register();

    // register() only asks the OS to start the process — the actual
    // token/error arrives later via the listeners above. If neither fires
    // within 12s, something is silently stuck (commonly: device has no
    // Google Play Services, or it's out of date) — surface that instead of
    // leaving the diagnostics screen stuck on "not yet" forever.
    if (registrationWatchdog) clearTimeout(registrationWatchdog);
    registrationWatchdog = setTimeout(() => {
      if (!pushStatus.tokenRegistered) {
        pushStatus.registering = false;
        pushStatus.lastError = 'No response after 12s. This usually means Google Play Services is missing, disabled, or out of date on this device.';
        emitStatus();
      }
    }, 12000);
  } catch (e) {
    pushStatus.registering = false;
    pushStatus.lastError = e.message;
    emitStatus();
  }
}

// Asks the backend to send a real push to every device this account has
// registered — the full end-to-end test, straight from Settings.
export async function sendServerTestPush(http) {
  const { data } = await http.post('/push/test');
  return data;
}
