// FairyChat's own exclusive sticker packs (FairyChat Premium perk) — unlike
// the Stickers tab's regular search results (pulled live from a GIF/sticker
// provider), these are bundled with the app itself so they always work even
// if that provider isn't configured. Organised into themed packs the same
// way Telegram groups its own sticker/emoji collections (Ducks, Birthday,
// meme reactions, gaming, etc.) — this is 100% original AI-generated
// artwork made for FairyChat, not copied from any other app.
export const PREMIUM_STICKER_PACKS = [
  {
    id: 'classic',
    label: 'FairyChat',
    icon: '🌟',
    stickers: [
      { id: 'fc-1', url: '/premium-stickers/sticker-1.webp', title: 'Thumbs up' },
      { id: 'fc-2', url: '/premium-stickers/sticker-2.webp', title: 'Laughing' },
      { id: 'fc-3', url: '/premium-stickers/sticker-3.webp', title: 'Sad' },
      { id: 'fc-4', url: '/premium-stickers/sticker-4.webp', title: 'Proud' },
      { id: 'fc-5', url: '/premium-stickers/sticker-5.webp', title: 'Love' },
      { id: 'fc-6', url: '/premium-stickers/sticker-6.webp', title: 'Sleepy' }
    ]
  },
  {
    id: 'ducks',
    label: 'Ducks',
    icon: '🦆',
    stickers: [
      { id: 'duck-1', url: '/premium-stickers/duck-1.webp', title: 'Proud duck' },
      { id: 'duck-2', url: '/premium-stickers/duck-2.webp', title: 'Laughing duck' },
      { id: 'duck-3', url: '/premium-stickers/duck-3.webp', title: 'Confused duck' },
      { id: 'duck-4', url: '/premium-stickers/duck-4.webp', title: 'Cool duck' }
    ]
  },
  {
    id: 'birthday',
    label: 'Birthday',
    icon: '🎂',
    stickers: [
      { id: 'bday-1', url: '/premium-stickers/birthday-1.webp', title: 'Blowing candles' },
      { id: 'bday-2', url: '/premium-stickers/birthday-2.webp', title: 'Gift' },
      { id: 'bday-3', url: '/premium-stickers/birthday-3.webp', title: 'Balloons' },
      { id: 'bday-4', url: '/premium-stickers/birthday-4.webp', title: 'Cake surprise' }
    ]
  },
  {
    id: 'weird',
    label: 'Weird',
    icon: '👁️',
    stickers: [
      { id: 'weird-1', url: '/premium-stickers/weird-1.webp', title: 'Potato king' },
      { id: 'weird-2', url: '/premium-stickers/weird-2.webp', title: 'Cat-fish' },
      { id: 'weird-3', url: '/premium-stickers/weird-3.webp', title: 'Noodle cloud' },
      { id: 'weird-4', url: '/premium-stickers/weird-4.webp', title: 'Blob' }
    ]
  },
  {
    id: 'meme',
    label: 'Meme',
    icon: '😂',
    stickers: [
      { id: 'meme-1', url: '/premium-stickers/meme-1.webp', title: 'Shocked' },
      { id: 'meme-2', url: '/premium-stickers/meme-2.webp', title: 'Skull' },
      { id: 'meme-3', url: '/premium-stickers/meme-3.webp', title: 'Sipping tea' },
      { id: 'meme-4', url: '/premium-stickers/meme-4.webp', title: 'Facepalm' }
    ]
  },
  {
    id: 'game',
    label: 'Game',
    icon: '🎮',
    // Growing pack — one more (game-over) lands here next.
    stickers: [
      { id: 'game-1', url: '/premium-stickers/game-1.webp', title: 'GG' },
      { id: 'game-2', url: '/premium-stickers/game-2.webp', title: 'Trophy' },
      { id: 'game-3', url: '/premium-stickers/game-3.webp', title: 'Lucky roll' }
    ]
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: '✅',
    stickers: [
      { id: 'badge-verified', url: '/premium-stickers/badge-verified.webp', title: 'Verified' }
    ]
  }
];

// Flat list, kept for any code that just wants "all premium stickers".
export const PREMIUM_STICKERS = PREMIUM_STICKER_PACKS.flatMap((p) => p.stickers);
