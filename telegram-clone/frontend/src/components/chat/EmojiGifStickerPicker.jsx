import { useEffect, useRef, useState } from 'react';
import GifPicker from './GifPicker';
import { EMOJI_CATEGORIES, STICKER_PACKS } from '../../data/emojiData';

// Telegram-style combined picker: Emoji (default) / GIFs / Stickers, switched
// via the three tabs at the bottom of the panel. Emoji has its own category
// strip along the top of the grid, same as the real app.
export default function EmojiGifStickerPicker({ onSelectEmoji, onSelectGif, onSelectSticker, onClose }) {
  const [tab, setTab] = useState('emoji'); // emoji | gif | sticker
  const [emojiCategory, setEmojiCategory] = useState(EMOJI_CATEGORIES[0].id);
  const [stickerPack, setStickerPack] = useState(STICKER_PACKS[0].id);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  const activeCategory = EMOJI_CATEGORIES.find((c) => c.id === emojiCategory) || EMOJI_CATEGORIES[0];
  const activePack = STICKER_PACKS.find((p) => p.id === stickerPack) || STICKER_PACKS[0];

  return (
    <div ref={boxRef} className="emg-picker">
      <div className="emg-picker__content">
        {tab === 'emoji' && (
          <>
            <div className="emg-cat-strip">
              {EMOJI_CATEGORIES.map((cat) => (
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

        {tab === 'sticker' && (
          <>
            <div className="emg-cat-strip">
              {STICKER_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  className={`emg-cat-btn${pack.id === stickerPack ? ' active' : ''}`}
                  onClick={() => setStickerPack(pack.id)}
                  title={pack.label}
                >
                  {pack.stickers[0]}
                </button>
              ))}
            </div>
            <div className="emg-sticker-grid">
              {activePack.stickers.map((s, i) => (
                <button key={`${s}-${i}`} className="emg-sticker-btn" onClick={() => onSelectSticker(s)}>{s}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="emg-tabbar">
        <button className={`emg-tab${tab === 'emoji' ? ' active' : ''}`} onClick={() => setTab('emoji')}>
          <span>😊</span> Emoji
        </button>
        <button className={`emg-tab${tab === 'gif' ? ' active' : ''}`} onClick={() => setTab('gif')}>
          <span>🎞️</span> GIFs
        </button>
        <button className={`emg-tab${tab === 'sticker' ? ' active' : ''}`} onClick={() => setTab('sticker')}>
          <span>🌟</span> Stickers
        </button>
      </div>
    </div>
  );
}
