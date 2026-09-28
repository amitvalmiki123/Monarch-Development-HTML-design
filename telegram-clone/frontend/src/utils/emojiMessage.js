// Detects "emoji-only" text messages (1-3 emoji, nothing else) so they can
// render jumbo-sized with no bubble background — same as Telegram. FairyChat
// Premium senders additionally get a gentle pop-in animation on top of the
// jumbo sizing (the "Animated Emojis" perk); everyone else just gets the
// static jumbo look.
const EMOJI_RE = /^(\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*){1,3}$/u;

export function isEmojiOnlyMessage(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  return EMOJI_RE.test(trimmed);
}
