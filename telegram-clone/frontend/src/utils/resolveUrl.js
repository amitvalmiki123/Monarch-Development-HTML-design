// Backend-relative URLs (e.g. "/uploads/xyz.png") work as-is on the web build
// because Vite/production hosting proxies them to the backend on the same
// origin. Packaged mobile (Capacitor) builds load from a different origin, so
// those URLs must be prefixed with the real backend base URL.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

export function resolveMediaUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBaseUrl}${url}`;
}
