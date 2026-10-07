# FairyChat Animated Emoji Pack — Telegram TGS

Our 720-emoji Lottie pack converted to Telegram's .tgs format so the
emojis can be uploaded as a REAL Telegram pack — after which they are
visible to EVERY Telegram user (official app included), exactly like
Telegram's own animated emoji.

## Status

- 720/720 converted (`convert-to-tgs.py`)
- 711 files under Telegram's 64KB limit; 9 need optimization (flagged by the converter)
- 10-file test set in `test-set/` (smallest/simplest files, ~1.8KB each)

## How to upload (one-time, needs YOUR Telegram account)

**Option A — Animated STICKER pack (no Premium needed, everyone can send):**
1. Official Telegram app me **@stickers** bot kholo
2. `/newpack` bhejo → pack ka naam poochega → **"FairyChat"** likho
3. Bot: "Send me the first sticker" → ab ek-ek karke:
   - pehle **emoji bhejo** (e.g. 💚), phir uska **.tgs file** bhejo (test-set/green-heart.tgs)
   - har file ke liye repeat karo (10 test files)
4. `/publish` → short link poochega → `/skip` ya "fairychat" link do
5. Done! Pack ka link: `t.me/addstickers/fairychat` — **koi bhi Telegram user add kar sakta hai, official app me bhi animation chalti hai**

**Option B — CUSTOM EMOJI pack (inline in text; upload ke liye Telegram Premium chahiye):**
1. @stickers bot me `/newemojipack`
2. Emoji + .tgs file pairs bhejo (same as above)
3. `/publish` — pack inline emojis ban jate hain (premium users send kar sakte hain, SABKO dikhte hain)

## Test set mapping

| File | Emoji |
|---|---|
| green-heart.tgs | 💚 |
| yellow-heart.tgs | 💛 |
| orange-heart.tgs | 🧡 |
| black-heart.tgs | 🖤 |
| white-heart.tgs | 🤍 |
| grey-heart.tgs | 🩶 |
| rainbow.tgs | 🌈 |
| upside-down-face.tgs | 🙃 |
| alien-monster.tgs | 👾 |
| cross-mark.tgs | ❌ |

## After the bot validates the test set

- Bot error aaye (mattes/masks reject hue) → converter me matte-flattening
  add karni padegi (source files me 844 matte layers + 56 masks hain)
- Test pass → baaki 710 files convert karke poora pack upload
- Phir FairyChat app me pack bundle/auto-suggest karna (Stage 3.2b)

## Notes

- Source: `mobile-builds/animatemojis-lottie-pack.zip` (720 Lottie JSONs)
- Conversion: 1024→512 canvas (precomp wrap, 50% scale), markers stripped,
  >3s durations trimmed, gzip -9
- Telegram TGS limits: 512x512, ≤3s, ≤64KB gzipped, no images/text/effects
