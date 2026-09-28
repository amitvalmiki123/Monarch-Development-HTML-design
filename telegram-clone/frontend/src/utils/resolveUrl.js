// Backend-relative URLs (e.g. "/uploads/xyz.png") work as-is on the web build
// because Vite/production hosting proxies them to the backend on the same
// origin. Packaged mobile (Capacitor) builds load from a different origin, so
// those URLs must be prefixed with the real backend base URL.
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

// Assets that ship INSIDE the app bundle itself (public/) rather than being
// uploaded to/served by the backend — premium stickers, app icons, etc.
// These must NEVER get the backend URL prefixed on, or the packaged mobile
// build tries to fetch them from the backend (which doesn't have them) and
// they silently fail to load — this was exactly why sent premium stickers
// showed as broken images in chat instead of the actual artwork.
const BUNDLED_ASSET_PREFIXES = ['/premium-stickers/', '/icons/'];

export function resolveMediaUrl(url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (BUNDLED_ASSET_PREFIXES.some((p) => url.startsWith(p))) return url;
  return `${apiBaseUrl}${url}`;
}
