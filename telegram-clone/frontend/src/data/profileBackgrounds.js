// Profile background (the "Profile Colour" FairyChat Premium perk) — the
// colour/gradient shown behind the avatar/name/action-buttons block on the
// Profile screen, optionally with a scattered icon pattern layered over it,
// same idea as Telegram's profile colour chooser.
//
// The user's picked ids are stored on the account (profile_bg_style /
// profile_bg_icon) and mapped back to real CSS here, so only known ids are
// ever rendered (nothing user-supplied is injected as raw CSS).

export const PROFILE_BG_GRADIENTS = [
  { id: 'grad-blue', css: 'linear-gradient(135deg, #5b8def 0%, #7a5cf0 100%)' },
  { id: 'grad-purple', css: 'linear-gradient(135deg, #a86bf5 0%, #6f4bd8 100%)' },
  { id: 'grad-sunset', css: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 'grad-rose', css: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
  { id: 'grad-teal', css: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'grad-ocean', css: 'linear-gradient(135deg, #4facfe 0%, #00c6fb 100%)' },
  { id: 'grad-fire', css: 'linear-gradient(135deg, #fa709a 0%, #f6d365 100%)' },
  { id: 'grad-night', css: 'linear-gradient(135deg, #30cfd0 0%, #4b1e9e 100%)' }
];

export const PROFILE_BG_SOLIDS = [
  { id: 'solid-blue', css: '#3390ec' },
  { id: 'solid-sky', css: '#70c2e5' },
  { id: 'solid-teal', css: '#6ec9cb' },
  { id: 'solid-green', css: '#7bc862' },
  { id: 'solid-orange', css: '#faa774' },
  { id: 'solid-red', css: '#e17076' },
  { id: 'solid-pink', css: '#f2749a' },
  { id: 'solid-violet', css: '#a695f7' }
];

// Icon layer options — the chosen glyph is repeated as a faint white SVG
// pattern over the background (Telegram's "pattern" layer).
export const PROFILE_BG_ICONS = [
  { id: 'none', label: 'None', glyph: null },
  { id: 'heart', label: 'Hearts', glyph: '❤' },
  { id: 'star', label: 'Stars', glyph: '★' },
  { id: 'fire', label: 'Fire', glyph: '🔥' },
  { id: 'flower', label: 'Flowers', glyph: '🌸' },
  { id: 'bolt', label: 'Bolts', glyph: '⚡' },
  { id: 'clover', label: 'Clover', glyph: '🍀' },
  { id: 'note', label: 'Music', glyph: '🎵' },
  { id: 'crown', label: 'Crowns', glyph: '👑' },
  { id: 'smile', label: 'Smiles', glyph: '😊' }
];

const ALL_STYLES = [...PROFILE_BG_GRADIENTS, ...PROFILE_BG_SOLIDS];
const STYLE_BY_ID = Object.fromEntries(ALL_STYLES.map((s) => [s.id, s.css]));
const ICON_BY_ID = Object.fromEntries(PROFILE_BG_ICONS.map((i) => [i.id, i.glyph]));

export function profileBgCss(styleId) {
  return STYLE_BY_ID[styleId] || null;
}

// Builds the repeating faint-glyph SVG pattern for an icon id (null for
// 'none'/unknown), ready to use as a CSS background-image.
export function profileBgPatternImage(iconId) {
  const glyph = ICON_BY_ID[iconId];
  if (!glyph) return null;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>`
    + `<text x='10' y='22' font-size='18' fill='rgba(255,255,255,0.16)'>${glyph}</text>`
    + `<text x='42' y='54' font-size='18' fill='rgba(255,255,255,0.10)'>${glyph}</text>`
    + `</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Convenience: both layers for a user object in one call.
export function profileBgLayers(user) {
  if (!user) return { background: null, pattern: null };
  return {
    background: profileBgCss(user.profileBgStyle),
    pattern: profileBgPatternImage(user.profileBgIcon)
  };
}
