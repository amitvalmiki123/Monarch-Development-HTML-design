import { useEffect, useState } from 'react';
import { getSocket } from '../api/socket';

// Combines the browser's own online/offline signal with the live socket
// connection state so we can show one reliable "no connection" banner,
// instead of silently failing requests or (worse) forcing a re-login.
export default function useNetworkStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [socketConnected, setSocketConnected] = useState(() => !!getSocket()?.connected);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    let socket = getSocket();
    let cancelled = false;

    const attach = () => {
      socket = getSocket();
      if (!socket) return;
      setSocketConnected(socket.connected);
      socket.on('connect', () => setSocketConnected(true));
      socket.on('disconnect', () => setSocketConnected(false));
      socket.on('connect_error', () => setSocketConnected(false));
    };

    attach();
    // The socket instance may be created slightly after this hook mounts
    // (e.g. right after login), so keep checking briefly until it exists.
    const poll = setInterval(() => {
      if (cancelled) return;
      if (!socket && getSocket()) attach();
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      const s = getSocket();
      if (s) {
        s.off('connect');
        s.off('disconnect');
        s.off('connect_error');
      }
    };
  }, []);

  return { online: online && socketConnected, deviceOnline: online };
}
