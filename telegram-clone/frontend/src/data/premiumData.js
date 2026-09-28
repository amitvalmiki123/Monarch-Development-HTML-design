// Preset palettes/options for FairyChat Premium's cosmetic perks — kept as
// small curated lists (like Telegram's own limited palette) rather than a
// raw colour/emoji picker, so results always look intentional.

export const NAME_COLORS = [
  '#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9',
  '#4dabf7', '#748ffc', '#b197fc', '#f783ac', '#e599f7'
];

// Emoji Status options — each `id` maps to a real animated Lottie file
// bundled at src/assets/lottie-emoji/<id>.json (rendered by <LottieEmoji>),
// not a plain Unicode character, so this actually looks/feels animated
// next to a name the way Telegram Premium's emoji status does.
export const STATUS_EMOJIS = [
  { id: 'fire', label: 'On fire' },
  { id: 'electricity', label: 'Energetic' },
  { id: 'rocket', label: 'Launching something' },
  { id: 'coffee', label: 'Coffee break' },
  { id: 'game', label: 'Gaming' },
  { id: 'glowing-star', label: 'Shining' },
  { id: 'muscle', label: 'Working out' },
  { id: 'party', label: 'Celebrating' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'cool', label: 'Feeling cool' },
  { id: 'red-heart', label: 'In love' }
];


// Profile badge styles — the little icon shown next to a Premium member's
// name everywhere (see components/common/PremiumBadge.jsx).
export const BADGE_STYLES = [
  { id: 'star', label: 'Gold Star' },
  { id: 'verified', label: 'Verified' }
];

// App icon ids the native Android project knows how to switch to — see
// android/app/src/main/AndroidManifest.xml's <activity-alias> entries and
// utils/appIcon.js. 'default' is always available to everyone; the rest
// are FairyChat Premium perks.
export const APP_ICONS = [
  { id: 'default', label: 'Classic', preview: '/icons/icon-192.png' },
  { id: 'gold', label: 'Gold', preview: '/icons/app-icon-gold.png' },
  { id: 'midnight', label: 'Midnight', preview: '/icons/app-icon-midnight.png' },
  { id: 'neon', label: 'Neon', preview: '/icons/app-icon-neon.png' }
];
