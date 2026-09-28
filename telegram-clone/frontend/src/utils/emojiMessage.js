// Detects "emoji-only" text messages (1-3 emoji, nothing else) so they can
// render jumbo-sized with no bubble background — same as Telegram. FairyChat
// Premium senders additionally get a gentle pop-in + idle-loop animation on
// top of the jumbo sizing (the "Animated Emojis" perk); everyone else just
// gets the static jumbo look.
const EMOJI_RE = /^(\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*){1,3}$/u;

// Same underlying detector, but as a *global* matcher used to find every
// individual emoji run anywhere inside a longer message (not just
// emoji-only ones) — this is what powers "animated emoji inline in normal
// text", the other half of the Premium perk: type a sentence with a couple
// of emoji in it and, for Premium senders, just those emoji glyphs get the
// little looping wiggle while the rest of the text stays completely normal.
const EMOJI_RUN_RE = /(\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;

export function isEmojiOnlyMessage(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return EMOJI_RE.test(trimmed);
}

// Splits `text` into an array of { text, emoji } segments — `emoji: true`
// segments are a single emoji run (possibly a flag/ZWJ sequence), everything
// else comes back as plain-text segments. Used to render inline animated
// emoji inside otherwise-normal message text.
export function splitEmojiSegments(text) {
  if (!text) return [];
  const segments = [];
  let lastIndex = 0;
  for (const match of text.matchAll(EMOJI_RUN_RE)) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), emoji: false });
    segments.push({ text: match[0], emoji: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), emoji: false });
  return segments;
}
