import axios from 'axios';

// In the browser (web/PWA) we talk to the backend through Vite's same-origin
// dev proxy using relative paths. In a packaged mobile app (Capacitor) there
// is no dev proxy, so VITE_API_BASE_URL must point at the real backend host.
const apiBase = import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : '/api';

const http = axios.create({
  baseURL: apiBase
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('monarch_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem('monarch_token');
      localStorage.removeItem('monarch_user');
      if (!location.pathname.startsWith('/login') && !location.pathname.startsWith('/register')) {
        location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default http;
