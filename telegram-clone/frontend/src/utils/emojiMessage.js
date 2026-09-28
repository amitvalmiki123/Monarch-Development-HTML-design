import { PREMIUM_EMOJIS } from '../data/premiumEmojiData';

// Detects "emoji-only" text messages (1-3 emoji, nothing else) so they can
// render jumbo-sized with no bubble background — same as Telegram. FairyChat
// Premium senders additionally get a gentle pop-in + idle-loop animation on
// top of the jumbo sizing (the "Animated Emojis" perk); everyone else just
// gets the static jumbo look.
//
// A message can also mix plain text with FairyChat Premium's 720-emoji
// "Animated Emojis" pack: picking one from the chat picker inserts a small
// `[id]` token (e.g. "[fire]") into the compose box, same idea as the
// `:shortcode:` placeholders WhatsApp/Discord/Slack show while typing a
// custom emoji — it reads fine as plain text while composing, and renders
// as the real looping animation, inline with the rest of the message, once
// sent. `[id]` is only ever treated as an animated-emoji token when `id`
// is an actual pack id (see PREMIUM_EMOJI_IDS below), so ordinary text that
// happens to contain square brackets is never misread as one.
const PREMIUM_EMOJI_IDS = new Set(PREMIUM_EMOJIS.map((e) => e.id));

const NATIVE_SRC = '\\p{Extended_Pictographic}(\\uFE0F|\\u200D\\p{Extended_Pictographic})*';
const BRACKET_SRC = '\\[([a-z0-9-]+)\\]';
// Group 1 = a whole bracket token (only used to know which alternative
// matched), group 2 = the id inside it, group 3 = a whole native emoji run.
const UNIT_RE = new RegExp(`(${BRACKET_SRC})|(${NATIVE_SRC})`, 'gu');

export function wrapAnimatedEmojiToken(id) {
  return `[${id}]`;
}

// Splits `text` into an array of segments — `{ text, emoji: true }` for a
// native Unicode emoji run, `{ text, emoji: true, animId }` for a FairyChat
// Premium animated-emoji token, and `{ text, emoji: false }` for everything
// else (including a `[bracketed]` run that isn't a real pack id).
export function splitEmojiSegments(text) {
  if (!text) return [];
  const segments = [];
  let lastIndex = 0;
  for (const match of text.matchAll(UNIT_RE)) {
    if (match.index > lastIndex) segments.push({ text: text.slice(lastIndex, match.index), emoji: false });
    const bracketId = match[2];
    if (bracketId && PREMIUM_EMOJI_IDS.has(bracketId)) {
      segments.push({ text: match[0], emoji: true, animId: bracketId });
    } else if (bracketId) {
      segments.push({ text: match[0], emoji: false });
    } else {
      segments.push({ text: match[0], emoji: true });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ text: text.slice(lastIndex), emoji: false });
  return segments;
}

export function isEmojiOnlyMessage(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const segments = splitEmojiSegments(trimmed);
  if (segments.some((s) => !s.emoji && s.text.trim() !== '')) return false;
  const emojiCount = segments.filter((s) => s.emoji).length;
  return emojiCount >= 1 && emojiCount <= 3;
}
