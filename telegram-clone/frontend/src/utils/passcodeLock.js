// App Passcode Lock — entirely client-side (the server never sees the PIN,
// exactly like Telegram's own local passcode). The PIN is hashed with
// SubtleCrypto (PBKDF2-derived SHA-256 digest) and a random per-device salt,
// both kept in localStorage. Only the hash is ever stored — never the PIN.

const STORE_KEY = 'monarch_passcode_lock';

function b64FromBytes(bytes) {
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

function bytesFromB64(b64) {
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function derive(pin, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return b64FromBytes(new Uint8Array(bits));
}

function readConfig() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeConfig(cfg) {
  localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
}

export function isPasscodeEnabled() {
  const cfg = readConfig();
  return !!(cfg && cfg.hash);
}

export function getAutoLockSeconds() {
  const cfg = readConfig();
  if (!cfg) return 0;
  return typeof cfg.autoLockSeconds === 'number' ? cfg.autoLockSeconds : 0; // 0 = immediately
}

export function setAutoLockSeconds(seconds) {
  const cfg = readConfig() || {};
  writeConfig({ ...cfg, autoLockSeconds: seconds });
}

export async function setPasscode(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  writeConfig({ hash, salt: b64FromBytes(salt), autoLockSeconds: readConfig()?.autoLockSeconds ?? 0 });
}

export async function verifyPasscode(pin) {
  const cfg = readConfig();
  if (!cfg || !cfg.hash) return false;
  const salt = bytesFromB64(cfg.salt);
  const hash = await derive(pin, salt);
  return hash === cfg.hash;
}

export function disablePasscode() {
  localStorage.removeItem(STORE_KEY);
  localStorage.removeItem('monarch_locked_at_hidden');
}

// --- Auto-lock bookkeeping (Page Visibility API) ---
// When the app is hidden (backgrounded / tab switched), we stamp the time.
// When it becomes visible again, if enough time has passed (per the
// configured auto-lock delay) — or the delay is "Immediately" (0) — we
// report that the app should now be locked.

const HIDDEN_AT_KEY = 'monarch_locked_at_hidden';

export function markHidden() {
  if (isPasscodeEnabled()) localStorage.setItem(HIDDEN_AT_KEY, String(Date.now()));
}

export function shouldLockOnResume() {
  if (!isPasscodeEnabled()) return false;
  const hiddenAt = Number(localStorage.getItem(HIDDEN_AT_KEY) || 0);
  if (!hiddenAt) return false;
  const delay = getAutoLockSeconds();
  if (delay < 0) return false; // "Never"
  if (delay === 0) return true; // "Immediately"
  return Date.now() - hiddenAt >= delay * 1000;
}

export function clearHiddenStamp() {
  localStorage.removeItem(HIDDEN_AT_KEY);
}

export const AUTO_LOCK_OPTIONS = [
  { value: 0, label: 'Immediately' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 3600, label: '1 hour' },
  { value: -1, label: 'Never' }
];
