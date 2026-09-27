// Small SVG icon set for the redesigned Profile screen, the pulled-down
// photo gallery overlay, the story viewer and the in-app camera — same
// house style as components/common/SettingsIcons.jsx (simple, single-color
// `currentColor` strokes/fills, agent-drawn per the user's own go-ahead,
// swappable later for custom art).

const stroke = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const base = { viewBox: '0 0 24 24', width: 22, height: 22, fill: 'currentColor' };

export function BackArrowIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <polyline points="15 5 8 12 15 19" />
    </svg>
  );
}

export function CloseXIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function FlashOffIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z" />
      <line x1="3" y1="21" x2="21" y2="3" />
    </svg>
  );
}

export function FlashOnIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9z" />
    </svg>
  );
}

export function GridToggleIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.2" />
    </svg>
  );
}

export function FlipCameraIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <path d="M17 4.5 20 7.5l-3 3" />
      <path d="M20 7.5H8.5A5.5 5.5 0 0 0 3 13" />
      <path d="M7 19.5 4 16.5l3-3" />
      <path d="M4 16.5h11.5A5.5 5.5 0 0 0 21 11" />
    </svg>
  );
}

export function GalleryIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="8.5" r="1.6" />
      <path d="M21 15.5l-5.5-5.5L4 21" />
    </svg>
  );
}

export function ShutterIcon() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72">
      <circle cx="36" cy="36" r="33" fill="none" stroke="#fff" strokeWidth="4" />
      <circle cx="36" cy="36" r="26" fill="#fff" />
    </svg>
  );
}

export function VideoShutterIcon() {
  return (
    <svg viewBox="0 0 72 72" width="72" height="72">
      <circle cx="36" cy="36" r="33" fill="none" stroke="#fff" strokeWidth="4" />
      <rect x="26" y="26" width="20" height="20" rx="5" fill="#ff4d4f" />
    </svg>
  );
}

export function CheckCircleIcon(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="10" opacity="0.15" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArchiveIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3" y="4" width="18" height="4.5" rx="1" />
      <path d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" />
      <line x1="10" y1="12.5" x2="14" y2="12.5" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V4.8c0-.4.4-.8.9-.8h4.2c.5 0 .9.4.9.8V7" />
      <path d="M6 7l1 12.2c0 1 .8 1.8 1.8 1.8h6.4c1 0 1.8-.8 1.8-1.8L18 7" />
    </svg>
  );
}
