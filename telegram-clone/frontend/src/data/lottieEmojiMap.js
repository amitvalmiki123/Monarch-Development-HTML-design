// Maps common Unicode emoji characters to one of our bundled Lottie
// animated-emoji ids (src/assets/lottie-emoji/<id>.json) so a Premium
// sender's message emoji render as a real animation instead of a plain
// glyph + CSS wiggle. Anything NOT in this map still gets the CSS-based
// jumbo/inline animation as a graceful fallback (see emojiMessage.js /
// MessageBubble.jsx) — this only needs to cover the emoji people actually
// send most, not the entire Unicode emoji set.
export const UNICODE_TO_LOTTIE = {
  '😀': 'happy', '😃': 'happy', '😄': 'happy', '🙂': 'happy', '😊': 'happy',
  '😂': 'tears-of-joy', '🤣': 'tears-of-joy',
  '😆': 'joyful', '😁': 'joyful',
  '😢': 'cry', '😭': 'sob',
  '😡': 'angry', '😠': 'angry',
  '😮': 'astonished', '😲': 'astonished', '😯': 'astonished',
  '❤️': 'red-heart', '❤': 'red-heart', '😍': 'red-heart',
  '👍': 'thumbs-up', '👎': 'thumbs-down',
  '👏': 'clap',
  '🔥': 'fire',
  '🎉': 'party', '🥳': 'party',
  '🤔': 'thinking',
  '😎': 'cool',
  '⚡': 'electricity',
  '🚀': 'rocket',
  '☕': 'coffee',
  '🎮': 'game',
  '⭐': 'glowing-star', '🌟': 'glowing-star',
  '💪': 'muscle',
  '😴': 'sleepy',
  '😉': 'wink',
  '✌️': 'victory', '✌': 'victory'
};

export function lottieIdForEmoji(char) {
  return UNICODE_TO_LOTTIE[char];
}
