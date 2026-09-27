import { io } from 'socket.io-client';

// Same idea as http.js: web build uses the same-origin dev proxy, packaged
// mobile builds need the real backend origin baked in at build time.
const socketBase = import.meta.env.VITE_API_BASE_URL || '/';

let socket = null;
let socketToken = null;

// BUG THIS FIXES: switching between saved accounts (Telegram-style account
// switcher) calls connectSocket(newToken), but the old guard only checked
// `socket.connected` — true almost always, since the previous account's
// socket rarely has time to disconnect on its own. That meant switching
// accounts silently kept the PREVIOUS account's authenticated socket alive
// and just re-pointed the UI's `user`/`token` state at the new account —
// every REST call (which reads the token fresh per-request) correctly used
// the new account, but every socket.emit('message:send', ...) kept going
// out over the old account's authenticated connection. The server
// identifies the sender by the *socket's* auth, not anything the client
// sends in the payload, so a message "sent" by the second account was
// actually recorded as sent by the first account — showing up on the
// first account's own side as its own outgoing message instead of an
// incoming one from the second account. Now we track which token the
// current socket was authenticated with and force a real reconnect
// whenever a different token is requested.
export function connectSocket(token) {
  if (socket && socket.connected && socketToken === token) return socket;
  if (socket) socket.disconnect();
  socketToken = token;
  socket = io(socketBase, {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketToken = null;
  }
}
