import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import http from '../api/http';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

const ACCOUNTS_KEY = 'monarch_accounts';

// Multiple saved logins (Telegram-style account switcher) are kept as a
// simple array in localStorage: [{ id, token, user }]. The "active" one is
// still mirrored into monarch_token / monarch_user for backward
// compatibility with the rest of the app.
function readAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAccounts(list) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('monarch_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('monarch_token'));
  const [loading, setLoading] = useState(true);
  // True once we've confirmed the session with the server at least once.
  // False (but with a cached user) means "logged in from cache, could not
  // reach the server yet" — the app should still open, just show a banner.
  const [offline, setOffline] = useState(false);
  const [accounts, setAccounts] = useState(readAccounts);

  const upsertAccount = useCallback((nextToken, nextUser) => {
    setAccounts((prev) => {
      const others = prev.filter((a) => a.user.id !== nextUser.id);
      const next = [...others, { id: nextUser.id, token: nextToken, user: nextUser }];
      writeAccounts(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    connectSocket(token);
    http.get('/users/me')
      .then((res) => {
        setUser(res.data.user);
        setOffline(false);
        localStorage.setItem('monarch_user', JSON.stringify(res.data.user));
        upsertAccount(token, res.data.user);
      })
      .catch((err) => {
        // Only a real auth rejection (401/403 - bad/expired token) should
        // force the user back to the login screen. A network failure (no
        // response at all, e.g. device offline / server unreachable) must
        // NOT log the user out — keep the cached session and just flag
        // that we're offline so the UI can show a "no connection" banner.
        const status = err.response?.status;
        if (status === 401 || status === 403) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('monarch_token');
          localStorage.removeItem('monarch_user');
        } else {
          setOffline(true);
        }
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem('monarch_token', nextToken);
    localStorage.setItem('monarch_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setOffline(false);
    connectSocket(nextToken);
    upsertAccount(nextToken, nextUser);
  }, [upsertAccount]);

  const login = useCallback(async (identifier, password) => {
    const res = await http.post('/auth/login', { identifier, password });
    persistSession(res.data.token, res.data.user);
    return res.data.user;
  }, [persistSession]);

  const register = useCallback(async (payload) => {
    const res = await http.post('/auth/register', payload);
    persistSession(res.data.token, res.data.user);
    return res.data.user;
  }, [persistSession]);

  const updateProfile = useCallback(async (payload) => {
    const res = await http.put('/users/me', payload);
    setUser(res.data.user);
    localStorage.setItem('monarch_user', JSON.stringify(res.data.user));
    setAccounts((prev) => {
      const next = prev.map((a) => (a.user.id === res.data.user.id ? { ...a, user: res.data.user } : a));
      writeAccounts(next);
      return next;
    });
    return res.data.user;
  }, []);

  // Removes only the *local* saved session for an account (used when the
  // account switcher's "remove" action is used) — does not touch the server.
  const forgetAccount = useCallback((userId) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.user.id !== userId);
      writeAccounts(next);
      return next;
    });
  }, []);

  // Switches the active session to an already-saved account without a full
  // logout — just swaps which token/user is "active" and reconnects the
  // socket, exactly like Telegram's account switcher.
  const switchAccount = useCallback((userId) => {
    const acc = accounts.find((a) => a.user.id === userId);
    if (!acc) return;
    localStorage.setItem('monarch_token', acc.token);
    localStorage.setItem('monarch_user', JSON.stringify(acc.user));
    setToken(acc.token);
    setUser(acc.user);
    setOffline(false);
    connectSocket(acc.token);
    // Full reload keeps every context (chats, sockets, message caches)
    // perfectly clean for the newly-active account.
    window.location.reload();
  }, [accounts]);

  const logout = useCallback((userId) => {
    const targetId = userId || user?.id;
    if (targetId) forgetAccount(targetId);
    localStorage.removeItem('monarch_token');
    localStorage.removeItem('monarch_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, [user, forgetAccount]);

  const deleteAccount = useCallback(async () => {
    await http.delete('/users/me');
    logout();
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      user, token, loading, offline, accounts,
      login, register, logout, updateProfile, deleteAccount,
      switchAccount, forgetAccount
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
