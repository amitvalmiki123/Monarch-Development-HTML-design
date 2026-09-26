// Modern outline-style SVG icons for the bottom nav, replacing the old
// emoji glyphs (which render inconsistently across devices and look nothing
// like Telegram's own vector nav bar). `active` swaps to a filled variant,
// same idea as Telegram's tab bar.
export function ChatsIcon({ active }) {
  return active ? (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>
  ) : (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
    </svg>
  );
}

export function ContactsIcon({ active }) {
  return active ? (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7v1H2v-1z" />
      <circle cx="17.5" cy="9.5" r="3" opacity="0.85" />
      <path d="M22 20.5c0-2.9-1.9-5.2-4.5-5.9.3 0.6.5 1.3.5 2v3.9h4v-0z" opacity="0.85" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <path d="M16 3.5c1.7.4 3 2 3 3.9 0 1.9-1.3 3.5-3 3.9" />
      <path d="M18 14c2.3.8 4 2.9 4 5.4" />
    </svg>
  );
}

export function SettingsIcon({ active }) {
  return (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" fill={active ? 'currentColor' : 'none'} />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .35 1.9l.05.05a2 2 0 1 1-2.85 2.85l-.05-.05a1.7 1.7 0 0 0-1.9-.35 1.7 1.7 0 0 0-1 1.55V19.6a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.9.35l-.05.05a2 2 0 1 1-2.85-2.85l.05-.05a1.7 1.7 0 0 0 .35-1.9 1.7 1.7 0 0 0-1.55-1H4.4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.35-1.9l-.05-.05a2 2 0 1 1 2.85-2.85l.05.05a1.7 1.7 0 0 0 1.9.35H10.5a1.7 1.7 0 0 0 1-1.55V4.4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.9-.35l.05-.05a2 2 0 1 1 2.85 2.85l-.05.05a1.7 1.7 0 0 0-.35 1.9v.1a1.7 1.7 0 0 0 1.55 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}

export function ProfileIcon({ active }) {
  return active ? (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="currentColor">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M4 20.2c0-4.3 3.6-7.8 8-7.8s8 3.5 8 7.8v.8H4v-.8z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M4 20.2c0-4.3 3.6-7.8 8-7.8s8 3.5 8 7.8" />
    </svg>
  );
}
