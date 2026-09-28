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
      { id: 'fc-1', url: '/premium-stickers/sticker-1.png', title: 'Thumbs up' },
      { id: 'fc-2', url: '/premium-stickers/sticker-2.png', title: 'Laughing' },
      { id: 'fc-3', url: '/premium-stickers/sticker-3.png', title: 'Sad' },
      { id: 'fc-4', url: '/premium-stickers/sticker-4.png', title: 'Proud' },
      { id: 'fc-5', url: '/premium-stickers/sticker-5.png', title: 'Love' },
      { id: 'fc-6', url: '/premium-stickers/sticker-6.png', title: 'Sleepy' }
    ]
  },
  {
    id: 'ducks',
    label: 'Ducks',
    icon: '🦆',
    stickers: [
      { id: 'duck-1', url: '/premium-stickers/duck-1.png', title: 'Proud duck' },
      { id: 'duck-2', url: '/premium-stickers/duck-2.png', title: 'Laughing duck' },
      { id: 'duck-3', url: '/premium-stickers/duck-3.png', title: 'Confused duck' },
      { id: 'duck-4', url: '/premium-stickers/duck-4.png', title: 'Cool duck' }
    ]
  },
  {
    id: 'birthday',
    label: 'Birthday',
    icon: '🎂',
    stickers: [
      { id: 'bday-1', url: '/premium-stickers/birthday-1.png', title: 'Blowing candles' },
      { id: 'bday-2', url: '/premium-stickers/birthday-2.png', title: 'Gift' },
      { id: 'bday-3', url: '/premium-stickers/birthday-3.png', title: 'Balloons' },
      { id: 'bday-4', url: '/premium-stickers/birthday-4.png', title: 'Cake surprise' }
    ]
  },
  {
    id: 'weird',
    label: 'Weird',
    icon: '👁️',
    // Growing pack — more absurd/meme-style stickers land here over time.
    stickers: [
      { id: 'weird-1', url: '/premium-stickers/weird-1.png', title: 'Potato king' }
    ]
  },
  {
    id: 'badges',
    label: 'Badges',
    icon: '✅',
    stickers: [
      { id: 'badge-verified', url: '/premium-stickers/badge-verified.png', title: 'Verified' }
    ]
  }
];

// Flat list, kept for any code that just wants "all premium stickers".
export const PREMIUM_STICKERS = PREMIUM_STICKER_PACKS.flatMap((p) => p.stickers);
