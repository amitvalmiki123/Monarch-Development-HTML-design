# Third-party animated emoji (FairyChat Premium "Animated Emojis")

The 720 `.json` files in this folder are **Google's official "Animated Noto
Emoji"** set, downloaded via https://animatemojis.com/ (which republishes
Google's Noto animated emoji collection in Lottie JSON format alongside
WebP/GIF).

- License: **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/)
- Author/attribution: **Google** (Noto Emoji project,
  https://github.com/googlefonts/noto-emoji)
- CC BY 4.0 explicitly permits commercial use, modification and
  redistribution, provided attribution is given — this notice plus the
  in-app "About" credit is that attribution.

These are **not** Telegram's own animated emoji/stickers and are not
extracted from any Telegram client or mod APK — they are Google's
independently-published, openly-licensed emoji artwork, used here to power
FairyChat Premium's "Animated Emojis" perk (a much larger, category-browsable
animated emoji set than the free-tier `src/assets/lottie-emoji/` selection).

`src/data/premiumEmojiData.js` groups every file into the 9 standard Unicode
CLDR emoji categories (Smileys & Emotion, People & Body, Animals & Nature,
Food & Drink, Travel & Places, Activities, Objects, Symbols, Flags) using the
`unicode-emoji-json` package's official category data matched against each
file's name — a handful of filenames that don't match a standard Unicode
slug were categorised manually.
