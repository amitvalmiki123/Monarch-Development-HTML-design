import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import http from '../api/http';
import { connectSocket, disconnectSocket } from '../api/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('monarch_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('monarch_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      connectSocket(token);
      http.get('/users/me')
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('monarch_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          setUser(null);
          setToken(null);
          localStorage.removeItem('monarch_token');
          localStorage.removeItem('monarch_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  const persistSession = useCallback((nextToken, nextUser) => {
    localStorage.setItem('monarch_token', nextToken);
    localStorage.setItem('monarch_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    connectSocket(nextToken);
  }, []);

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
    return res.data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('monarch_token');
    localStorage.removeItem('monarch_user');
    setToken(null);
    setUser(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
