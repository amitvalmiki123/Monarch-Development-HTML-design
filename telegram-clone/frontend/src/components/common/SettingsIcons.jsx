// Small, consistent set of SVG icons for the Profile/Settings screens,
// replacing the mismatched emoji glyphs that used to sit inside the
// colored round badges there. Drawn in the same spirit as the bottom
// tab-bar icons (components/nav/NavIcons.jsx): simple, single-color
// (`currentColor`, which the badge CSS already sets to white),
// small-footprint shapes that read clearly at ~16-18px.
//
// This is an interim, agent-drawn set (per the user's own request) that
// they plan to swap out for their own custom SVGs later — every icon here
// is a small independent component so any one of them can be replaced
// without touching the others.

const base = { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'currentColor' };
const stroke = { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function UserGlyphIcon() {
  return <svg {...base}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7v1H4v-1z" /></svg>;
}

export function AtIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.6 7.2" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PhoneIcon() {
  return <svg {...base}><path d="M7.1 2.6l3 .5.9 3.6-2 1.8a13 13 0 0 0 6.5 6.5l1.8-2 3.6.9.5 3a3 3 0 0 1-3.2 2.5C10.6 18.6 5.4 13.4 4.1 6.8a3 3 0 0 1 3-4.2z" /></svg>;
}

export function CakeIcon() {
  return (
    <svg {...stroke}>
      <path d="M4 20v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6" />
      <path d="M2 20h20" />
      <path d="M8 12V9c0-1 1-1.6 1-2.6S8.3 4.6 8.3 4M12 12V9c0-1 1-1.6 1-2.6S12.3 4.6 12.3 4M16 12V9c0-1 1-1.6 1-2.6S16.3 4.6 16.3 4" />
      <path d="M4 16.2c1 .6 1.7.6 2.7 0s2-.6 3 0 1.7.6 2.7 0 2-.6 3 0 1.7.6 2.6 0" />
    </svg>
  );
}

export function AddPersonIcon() {
  return (
    <svg {...stroke}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.6 20c0-3.7 2.9-6.4 6.4-6.4S15.4 16.3 15.4 20" />
      <line x1="18.5" y1="7" x2="18.5" y2="13" />
      <line x1="15.5" y1="10" x2="21.5" y2="10" />
    </svg>
  );
}

export function LogoutIcon() {
  return (
    <svg {...stroke}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="15 17 20 12 15 7" />
      <line x1="20" y1="12" x2="8" y2="12" />
    </svg>
  );
}

export function MoonIcon() {
  return <svg {...base}><path d="M20.6 15.6A9 9 0 1 1 8.4 3.4a7 7 0 0 0 12.2 12.2z" /></svg>;
}

export function SunIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="4.2" fill="currentColor" stroke="none" />
      <g strokeLinecap="round">
        <line x1="12" y1="1.8" x2="12" y2="4.2" />
        <line x1="12" y1="19.8" x2="12" y2="22.2" />
        <line x1="4.2" y1="4.2" x2="5.9" y2="5.9" />
        <line x1="18.1" y1="18.1" x2="19.8" y2="19.8" />
        <line x1="1.8" y1="12" x2="4.2" y2="12" />
        <line x1="19.8" y1="12" x2="22.2" y2="12" />
        <line x1="4.2" y1="19.8" x2="5.9" y2="18.1" />
        <line x1="18.1" y1="5.9" x2="19.8" y2="4.2" />
      </g>
    </svg>
  );
}

export function BookmarkIcon() {
  return <svg {...base}><path d="M6 2.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V3.5a1 1 0 0 1 1-1z" /></svg>;
}

export function ImageIcon() {
  return (
    <svg {...stroke}>
      <rect x="3" y="4" width="18" height="16" rx="2.4" />
      <circle cx="8.5" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
      <path d="M21 16l-5.5-5.5a2 2 0 0 0-2.8 0L4 19" />
    </svg>
  );
}

export function BellIcon() {
  return <svg {...base}><path d="M12 2.3a5.5 5.5 0 0 0-5.5 5.5v3.1c0 .9-.4 1.8-1.1 2.4l-1 1a1.4 1.4 0 0 0 1 2.4h13.2a1.4 1.4 0 0 0 1-2.4l-1-1a3.3 3.3 0 0 1-1.1-2.4V7.8A5.5 5.5 0 0 0 12 2.3z" /><path d="M9.5 19.8a2.5 2.5 0 0 0 5 0z" /></svg>;
}

export function GroupIcon() {
  return (
    <svg {...stroke}>
      <circle cx="8.5" cy="8" r="3" />
      <path d="M2.5 19.5c0-3.3 2.7-5.8 6-5.8s6 2.5 6 5.8" />
      <circle cx="17" cy="9" r="2.4" opacity="0.85" />
      <path d="M15.5 14c2.7.3 4.9 2.4 5 5.5" opacity="0.85" />
    </svg>
  );
}

export function SpeakerIcon() {
  return (
    <svg {...stroke}>
      <path d="M4 9.5h3.2L12 5.8v12.4L7.2 14.5H4z" fill="currentColor" stroke="none" />
      <path d="M16 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

export function WrenchIcon() {
  return (
    <svg {...stroke}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5l-6 6a1.7 1.7 0 0 0 2.4 2.4l6-6a4 4 0 0 0 5-5.4l-2.7 2.7-2-2z" />
    </svg>
  );
}

export function PuzzleIcon() {
  return (
    <svg {...stroke}>
      <path d="M9 3.5h3v2a1.6 1.6 0 0 0 3 0v-2h3a1.5 1.5 0 0 1 1.5 1.5v3h-2a1.6 1.6 0 0 0 0 3h2v3a1.5 1.5 0 0 1-1.5 1.5h-3v-2a1.6 1.6 0 0 0-3 0v2h-3A1.5 1.5 0 0 1 7.5 15v-3h2a1.6 1.6 0 0 0 0-3h-2v-3A1.5 1.5 0 0 1 9 3.5z" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg {...stroke}>
      <polyline points="4 7 20 7" />
      <path d="M9 7V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8V7" />
      <path d="M6.5 7l1 12.3A2 2 0 0 0 9.5 21h5a2 2 0 0 0 2-1.7L17.5 7" />
      <line x1="10" y1="11" x2="10" y2="16.5" />
      <line x1="14" y1="11" x2="14" y2="16.5" />
    </svg>
  );
}

export function CrownIcon() {
  return <svg {...base}><path d="M3 8.5l3.6 2.6L12 4l5.4 7.1 3.6-2.6-1.6 9.5H4.6L3 8.5z" /><rect x="4.6" y="18" width="14.8" height="2.2" rx="1" /></svg>;
}

export function LockIcon() {
  return (
    <svg {...stroke}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
      <circle cx="12" cy="15.3" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 3l7 3v5.5c0 4.6-3 8.3-7 9.5-4-1.2-7-4.9-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function KeyIcon() {
  return (
    <svg {...stroke}>
      <circle cx="8" cy="15" r="3.5" />
      <path d="M10.4 12.6L18 5" />
      <path d="M15 8l2.3 2.3" />
      <path d="M17.5 5.5L20 8" />
    </svg>
  );
}

export function DevicesIcon() {
  return (
    <svg {...stroke}>
      <rect x="3" y="4" width="13" height="9" rx="1.5" />
      <line x1="7" y1="17" x2="12" y2="17" />
      <rect x="16.5" y="9" width="5.5" height="9" rx="1.2" />
      <line x1="19" y1="15.3" x2="19" y2="15.4" />
    </svg>
  );
}

export function StarIcon() {
  return <svg {...base}><path d="M12 2.5l2.5 4.9 5.4.8-3.9 3.8.9 5.4L12 15l-4.9 2.4.9-5.4-3.9-3.8 5.4-.8L12 2.5z" /></svg>;
}

export function PaletteIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.7 2-1.8 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7h2C19 15 21 13 21 10.5 21 6.4 17 3 12 3z" />
      <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PhoneAppIcon() {
  return (
    <svg {...stroke}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <line x1="11" y1="18.3" x2="13" y2="18.3" />
    </svg>
  );
}

export function CameraGlyphIcon() {
  return (
    <svg {...stroke}>
      <path d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h1.7l1-2h7.6l1 2h1.7A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </svg>
  );
}

export function PencilGlyphIcon() {
  return (
    <svg {...stroke}>
      <path d="M4 20l1-4.4L15.6 5a1.5 1.5 0 0 1 2.1 0l1.3 1.3a1.5 1.5 0 0 1 0 2.1L8.4 19 4 20z" />
      <line x1="14" y1="6.6" x2="17.4" y2="10" />
    </svg>
  );
}

export function ChatBubbleGlyphIcon() {
  return <svg {...base}><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /></svg>;
}

export function UsersGlyphIcon() {
  return (
    <svg {...stroke}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.6 19.5c0-3.6 2.9-6.2 6.4-6.2s6.4 2.6 6.4 6.2" />
      <circle cx="17" cy="8.6" r="2.6" opacity="0.85" />
      <path d="M15.4 13.6c2.7.5 4.7 2.6 5 5.9" opacity="0.85" />
    </svg>
  );
}

export function MegaphoneGlyphIcon() {
  return (
    <svg {...stroke}>
      <path d="M3 10v4a1.5 1.5 0 0 0 1.5 1.5H6l1.4 4.5a1.2 1.2 0 0 0 2.3-.7L8.6 15.5H10l8-4.4V8.9L10 4.5H4.5A1.5 1.5 0 0 0 3 6z" />
      <line x1="20" y1="8" x2="20" y2="16" />
    </svg>
  );
}

export function SmileGlyphIcon() {
  return (
    <svg {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.2 14c1 1.3 2.2 2 3.8 2s2.8-.7 3.8-2" />
      <circle cx="8.7" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.3" cy="9.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ReactionIcon() {
  return (
    <svg {...stroke}>
      <path d="M12 19.5s-7-4.2-9-8.4C1.6 7.8 3.6 5 6.6 5c1.7 0 3 .9 3.9 2.2.3.4.9.4 1.2 0C12.5 5.9 13.8 5 15.5 5c3 0 5 2.8 3.6 6.1-2 4.2-9 8.4-9 8.4z" />
    </svg>
  );
}

export function SparkleLockIcon() {
  return (
    <svg {...base}>
      <path d="M12 2.5l1.6 4.7 4.7 1.6-4.7 1.6L12 15.1l-1.6-4.7-4.7-1.6 4.7-1.6L12 2.5z" />
      <path d="M18.5 14l.8 2.3 2.3.8-2.3.8-.8 2.3-.8-2.3-2.3-.8 2.3-.8.8-2.3z" opacity="0.85" />
    </svg>
  );
}
