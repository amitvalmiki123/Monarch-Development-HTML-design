import { io } from 'socket.io-client';
import { notifyNewMessage } from '../utils/notifications';

// The main socket (api/socket.js) only ever connects for the *active*
// account. When you switch to a second saved account, the first one used
// to go completely silent — no connection at all — so it could never get a
// notification for an incoming message, even while this app is still open
// on the device. This keeps one lightweight extra socket connection alive
// per *other* saved account, purely to fire a local notification when a
// message arrives for it.
//
// Important caveat: this only helps while the FairyChat app process itself
// is still running (foreground or recently backgrounded). Android
// aggressively freezes background network activity after a short while
// (Doze / App Standby), and once the app is fully closed/swiped away this
// can't fire at all — that's exactly the gap real Firebase Cloud Messaging
// push closes, since FCM messages are delivered by Google Play Services
// even when the app itself isn't running.
const socketBase = import.meta.env.VITE_API_BASE_URL || '/';
const sockets = new Map(); // userId -> socket.io client

export function syncBackgroundSockets(accounts, activeUserId) {
  const wantedIds = new Set((accounts || []).filter((a) => a.user.id !== activeUserId).map((a) => a.user.id));

  for (const [uid, sock] of sockets) {
    if (!wantedIds.has(uid)) {
      sock.disconnect();
      sockets.delete(uid);
    }
  }

  (accounts || []).forEach((acc) => {
    if (acc.user.id === activeUserId || sockets.has(acc.user.id)) return;
    const sock = io(socketBase, {
      path: '/socket.io',
      auth: { token: acc.token },
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    sock.on('message:new', (message) => {
      if (message.senderId === acc.user.id) return;
      notifyNewMessage({
        title: acc.user.name,
        body: 'New message — tap to switch accounts',
        chatId: message.chatId
      });
    });
    sockets.set(acc.user.id, sock);
  });
}

export function disconnectAllBackgroundSockets() {
  for (const sock of sockets.values()) sock.disconnect();
  sockets.clear();
}
