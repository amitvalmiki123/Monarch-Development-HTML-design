import { Capacitor } from '@capacitor/core';

let localNotifModule = null;
let pushNotifModule = null;
let channelReady = false;
let webPermissionAsked = false;
let notifIdCounter = 1;
let pushListenersAttached = false;

// Shared status the Settings -> Notifications diagnostics screen reads, so
// you (and I) can see exactly which step failed without needing adb logcat
// or server log access.
export const pushStatus = {
  isNative: Capacitor.isNativePlatform(),
  localPermission: 'unknown', // 'granted' | 'denied' | 'prompt' | 'unknown'
  serverEnabled: null, // null = not checked yet
  serverError: null,
  tokenRegistered: false,
  lastError: null
};

async function getLocalNotifications() {
  if (!localNotifModule) localNotifModule = await import('@capacitor/local-notifications');
  return localNotifModule.LocalNotifications;
}

async function getPushNotifications() {
  if (!pushNotifModule) pushNotifModule = await import('@capacitor/push-notifications');
  return pushNotifModule.PushNotifications;
}

// Sets up whatever's needed so `notifyNewMessage` can fire immediately:
// - Native (Android/iOS via Capacitor): local-notification permission + a
//   dedicated Android notification channel (works right now, no server
//   setup needed, and keeps firing as long as the app process is alive,
//   including minimized in the background).
// - Web/PWA: the standard browser Notification permission.
export async function initNotifications() {
  try {
    if (Capacitor.isNativePlatform()) {
      const LocalNotifications = await getLocalNotifications();
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
      pushStatus.localPermission = perm.display;
      if (!channelReady) {
        await LocalNotifications.createChannel({
          id: 'messages',
          name: 'Messages',
          description: 'New chat messages',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true
        }).catch(() => {});
        channelReady = true;
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
}

// Fires an immediate local notification for a newly-arrived message. Safe to
// call unconditionally; every branch is best-effort and swallows errors.
export async function notifyNewMessage({ title, body, chatId }) {
  try {
    if (Capacitor.isNativePlatform()) {
      const LocalNotifications = await getLocalNotifications();
      await LocalNotifications.schedule({
        notifications: [{
          id: notifIdCounter++,
          title,
          body,
          channelId: 'messages',
          smallIcon: 'ic_stat_notify',
          extra: { chatId }
        }]
      });
    } else if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
      new Notification(title, { body, tag: `chat-${chatId}` });
    }
  } catch (e) {
    pushStatus.lastError = e.message;
  }
}

// Fire a local notification right now, independent of any backend/socket —
// isolates whether permission + the Android notification channel/icon setup
// works at all, from Settings -> Notifications -> "Send Test Notification".
export async function sendLocalTestNotification() {
  await initNotifications();
  await notifyNewMessage({ title: 'FairyChat', body: 'Local test notification — if you see this, local alerts work!', chatId: 'test' });
}

// Full "push even when the app is fully closed/killed" support needs a real
// Firebase Cloud Messaging project (google-services.json on the Android
// side + a service-account key on the backend). Until those credentials
// are provided, /api/push/config reports { enabled: false } and this is a
// safe no-op — nothing here ever touches native Firebase code unless the
// backend confirms it's actually configured.
export async function registerPushIfConfigured(http) {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const { data } = await http.get('/push/config');
    pushStatus.serverEnabled = !!data?.enabled;
    pushStatus.serverError = data?.error || null;
    if (!data?.enabled) return;

    const PushNotifications = await getPushNotifications();
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      pushStatus.lastError = 'Notification permission was not granted';
      return;
    }

    if (!pushListenersAttached) {
      pushListenersAttached = true;
      PushNotifications.addListener('registration', (token) => {
        pushStatus.tokenRegistered = true;
        http.post('/push/register-token', { token: token.value, platform: 'android' }).catch(() => {});
      });
      PushNotifications.addListener('registrationError', (err) => {
        pushStatus.lastError = `Registration error: ${err?.error || JSON.stringify(err)}`;
      });
      // Android does not auto-show a system-tray notification for a push
      // that arrives while the app is in the foreground — show it manually
      // via a local notification so foreground behaves the same as
      // background/closed.
      PushNotifications.addListener('pushNotificationReceived', async (notification) => {
        const LocalNotifications = await getLocalNotifications();
        LocalNotifications.schedule({
          notifications: [{
            id: notifIdCounter++,
            title: notification.title || 'FairyChat',
            body: notification.body || 'New message',
            channelId: 'messages',
            smallIcon: 'ic_stat_notify'
          }]
        }).catch(() => {});
      });
    }

    await PushNotifications.register();
  } catch (e) {
    pushStatus.lastError = e.message;
  }
}

// Asks the backend to send a real push to every device this account has
// registered — the full end-to-end test, straight from Settings.
export async function sendServerTestPush(http) {
  const { data } = await http.post('/push/test');
  return data;
}
