import { useEffect, useRef, useState } from 'react';
import GifPicker from './GifPicker';
import StickerPicker from './StickerPicker';
import { EMOJI_CATEGORIES } from '../../data/emojiData';

// Telegram-style combined picker: Emoji (default) / GIFs / Stickers, switched
// via the three tabs at the bottom of the panel. Emoji has its own category
// strip along the top of the grid, same as the real app. Stickers are real
// animated stickers pulled from the same GIF provider (Klipy/Giphy both
// expose a dedicated, transparent-background "stickers" collection).
function useVisibleEmojiCategories() {
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem('monarch_hidden_emoji_categories') || '[]'); } catch { return []; }
  });
  // Settings page can change this while the picker is closed; re-read each
  // time the picker is (re)opened so toggles there take effect immediately.
  useEffect(() => {
    try { setHidden(JSON.parse(localStorage.getItem('monarch_hidden_emoji_categories') || '[]')); } catch { /* ignore */ }
  }, []);
  const visible = EMOJI_CATEGORIES.filter((c) => !hidden.includes(c.id));
  return visible.length > 0 ? visible : EMOJI_CATEGORIES;
}

export default function EmojiGifStickerPicker({ onSelectEmoji, onSelectGif, onSelectSticker, onClose }) {
  const [tab, setTab] = useState('emoji'); // emoji | gif | sticker
  const categories = useVisibleEmojiCategories();
  const [emojiCategory, setEmojiCategory] = useState(categories[0].id);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  const activeCategory = categories.find((c) => c.id === emojiCategory) || categories[0];

  return (
    <div ref={boxRef} className="emg-picker">
      <div className="emg-picker__content">
        {tab === 'emoji' && (
          <>
            <div className="emg-cat-strip">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`emg-cat-btn${cat.id === emojiCategory ? ' active' : ''}`}
                  onClick={() => setEmojiCategory(cat.id)}
                  title={cat.label}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
            <div className="emg-emoji-grid">
              {activeCategory.emojis.map((e, i) => (
                <button key={`${e}-${i}`} className="emg-emoji-btn" onClick={() => onSelectEmoji(e)}>{e}</button>
              ))}
            </div>
          </>
        )}

        {tab === 'gif' && <GifPicker onSelect={onSelectGif} />}

        {tab === 'sticker' && <StickerPicker onSelect={onSelectSticker} />}
      </div>

      <div className="emg-tabbar">
        <button className={`emg-tab${tab === 'emoji' ? ' active' : ''}`} onClick={() => setTab('emoji')}>
          <span>😊</span> Emoji
        </button>
        <button className={`emg-tab${tab === 'gif' ? ' active' : ''}`} onClick={() => setTab('gif')}>
          <span>🎞️</span> GIFs
        </button>
        <button className={`emg-tab${tab === 'sticker' ? ' active' : ''}`} onClick={() => setTab('sticker')}>
          <span>🧩</span> Stickers
        </button>
      </div>
    </div>
  );
}
