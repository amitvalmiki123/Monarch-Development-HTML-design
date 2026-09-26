import { Capacitor } from '@capacitor/core';

let localNotifModule = null;
let pushNotifModule = null;
let channelReady = false;
let webPermissionAsked = false;
let notifIdCounter = 1;

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
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') await LocalNotifications.requestPermissions();
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
    } else if ('Notification' in window && !webPermissionAsked) {
      webPermissionAsked = true;
      if (Notification.permission === 'default') await Notification.requestPermission();
    }
  } catch {
    // Notifications are a nice-to-have — never let setup failures break the app.
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
  } catch {
    // best-effort
  }
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
    if (!data?.enabled) return;

    const PushNotifications = await getPushNotifications();
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions();
      if (req.receive !== 'granted') return;
    }

    PushNotifications.addListener('registration', (token) => {
      http.post('/push/register-token', { token: token.value, platform: 'android' }).catch(() => {});
    });
    PushNotifications.addListener('registrationError', () => {});

    await PushNotifications.register();
  } catch {
    // Firebase not configured / native plugin unavailable — ignore.
  }
}
