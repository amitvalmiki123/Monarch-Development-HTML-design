import { useState } from 'react';
import { EMOJI_CATEGORIES } from '../../data/emojiData';

// Full emoji grid for reacting with ANY emoji — the "Infinite Reactions"
// FairyChat Premium perk, opened from the "+" at the end of the message
// action sheet's quick-reaction row (free accounts are limited to their
// configured quick-reactions bar instead).
export default function ReactionEmojiPicker({ onSelect, onClose }) {
  const [category, setCategory] = useState(EMOJI_CATEGORIES[0].id);
  const active = EMOJI_CATEGORIES.find((c) => c.id === category) || EMOJI_CATEGORIES[0];

  return (
    <div className="reaction-picker-sheet" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="reaction-picker-sheet__panel">
        <div className="emg-cat-strip">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`emg-cat-btn${cat.id === category ? ' active' : ''}`}
              onClick={() => setCategory(cat.id)}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
        <div className="reaction-picker-sheet__grid">
          {active.emojis.map((e, i) => (
            <button key={`${e}-${i}`} onClick={() => { onSelect(e); onClose(); }}>{e}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
