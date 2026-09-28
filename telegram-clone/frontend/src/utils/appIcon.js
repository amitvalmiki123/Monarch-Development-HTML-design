import { registerPlugin, Capacitor } from '@capacitor/core';

// Native bridge to AppIconPlugin.java (Android only — see AndroidManifest's
// <activity-alias> entries). A complete no-op in the browser/PWA build,
// where "app icon" just stays a cosmetic preview in Settings since there's
// no OS launcher icon to swap there.
const AppIcon = registerPlugin('AppIcon');

export async function applyNativeAppIcon(iconId) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await AppIcon.setIcon({ iconId: iconId || 'default' });
  } catch {
    // Non-fatal — worst case the launcher icon just doesn't change this
    // time; the user's chosen preference is still saved server-side and
    // this gets retried next app launch (see App.jsx).
  }
}
