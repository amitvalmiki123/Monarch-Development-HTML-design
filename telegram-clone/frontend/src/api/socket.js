import { io } from 'socket.io-client';

// Same idea as http.js: web build uses the same-origin dev proxy, packaged
// mobile builds need the real backend origin baked in at build time.
const socketBase = import.meta.env.VITE_API_BASE_URL || '/';

let socket = null;

export function connectSocket(token) {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();
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
  }
}
