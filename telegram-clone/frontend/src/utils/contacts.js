import { Capacitor } from '@capacitor/core';

// Device contact sync only makes sense inside the installed Android/iOS app
// (a browser has no API to read the phone's address book). We detect that
// here so the web build can just hide the feature instead of erroring.
export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

// Reads the device's contact list (name + phone numbers only — nothing else
// is requested or sent anywhere) and returns a flat, de-duplicated list of
// { name, phone } pairs. Throws if the user denies the permission prompt.
export async function readDeviceContacts() {
  if (!isNativeApp()) return [];
  const { Contacts } = await import('@capacitor/contacts');
  const result = await Contacts.find({
    fields: ['displayName', 'phoneNumbers'],
    desiredFields: ['displayName', 'phoneNumbers'],
    multiple: true,
    hasPhoneNumber: true
  });
  const out = [];
  for (const c of result.contacts || []) {
    const name = c.displayName || c.name?.display || 'Unknown';
    for (const p of c.phoneNumbers || []) {
      if (p?.value) out.push({ name, phone: p.value });
    }
  }
  return out;
}
