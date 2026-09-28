import { useEffect, useRef, useState } from 'react';
import GifPicker from './GifPicker';
import StickerPicker from './StickerPicker';
import { EMOJI_CATEGORIES } from '../../data/emojiData';
import { PREMIUM_EMOJI_CATEGORIES, PREMIUM_EMOJIS } from '../../data/premiumEmojiData';
import PremiumLottieEmoji from '../common/PremiumLottieEmoji';
import { useAuth } from '../../context/AuthContext';

// Telegram-style combined picker: Emoji (default) / GIFs / Stickers, switched
// via the three tabs at the bottom of the panel. Emoji has its own category
// strip along the top of the grid, same as the real app. Stickers are real
// animated stickers pulled from the same GIF provider (Klipy/Giphy both
// expose a dedicated, transparent-background "stickers" collection).
//
// The Emoji tab's category strip has two groups: the normal (plain Unicode,
// send-for-free) categories, then — after a small divider — FairyChat
// Premium's "Animated Emojis" categories. Animated emoji are visible and
// *animating* for every user (so free users get to see exactly what they're
// missing, same idea as the Stickers tab's premium packs), but only a
// Premium account can actually send one; a free account tapping one gets a
// short upsell instead, same pattern already used for premium stickers.
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

export default function EmojiGifStickerPicker({ onSelectEmoji, onSelectGif, onSelectSticker, onSelectAnimatedEmoji, onClose }) {
  const { user } = useAuth();
  const isPremium = !!user?.isPremium;
  const [tab, setTab] = useState('emoji'); // emoji | gif | sticker
  const categories = useVisibleEmojiCategories();
  const [emojiCategory, setEmojiCategory] = useState({ kind: 'normal', id: categories[0].id });
  const boxRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  const activeCategory = emojiCategory.kind === 'normal'
    ? (categories.find((c) => c.id === emojiCategory.id) || categories[0])
    : null;
  const activePremiumCategory = emojiCategory.kind === 'animated'
    ? (PREMIUM_EMOJI_CATEGORIES.find((c) => c.id === emojiCategory.id) || PREMIUM_EMOJI_CATEGORIES[0])
    : null;
  const premiumEmojisInCategory = activePremiumCategory
    ? PREMIUM_EMOJIS.filter((e) => e.category === activePremiumCategory.id)
    : [];

  const handlePremiumEmojiClick = (e) => {
    if (isPremium) {
      onSelectAnimatedEmoji?.(e);
    } else {
      alert('✨ This is a FairyChat Premium animated emoji. Redeem a Premium code in Settings to send it.');
    }
  };

  return (
    <div ref={boxRef} className="emg-picker">
      <div className="emg-picker__content">
        {tab === 'emoji' && (
          <>
            <div className="emg-cat-strip">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`emg-cat-btn${emojiCategory.kind === 'normal' && cat.id === emojiCategory.id ? ' active' : ''}`}
                  onClick={() => setEmojiCategory({ kind: 'normal', id: cat.id })}
                  title={cat.label}
                >
                  {cat.icon}
                </button>
              ))}
              <span className="emg-cat-divider" />
              {PREMIUM_EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`emg-cat-btn emg-cat-btn--animated${emojiCategory.kind === 'animated' && cat.id === emojiCategory.id ? ' active' : ''}`}
                  onClick={() => setEmojiCategory({ kind: 'animated', id: cat.id })}
                  title={`${cat.label} (Animated Emojis${isPremium ? '' : ' — Premium'})`}
                >
                  {cat.icon}
                  {!isPremium && <span className="emg-cat-btn__lock">🔒</span>}
                </button>
              ))}
            </div>

            {activeCategory && (
              <div className="emg-emoji-grid">
                {activeCategory.emojis.map((e, i) => (
                  <button key={`${e}-${i}`} className="emg-emoji-btn" onClick={() => onSelectEmoji(e)}>{e}</button>
                ))}
              </div>
            )}

            {activePremiumCategory && (
              <>
                {!isPremium && (
                  <div className="emg-animated-hint">
                    ✨ FairyChat Premium — watch them animate, unlock to send
                  </div>
                )}
                <div className="emg-animated-grid">
                  {premiumEmojisInCategory.map((e) => (
                    <button
                      key={e.id}
                      className={`emg-animated-cell${isPremium ? '' : ' emg-animated-cell--locked'}`}
                      title={e.label}
                      onClick={() => handlePremiumEmojiClick(e)}
                    >
                      <PremiumLottieEmoji id={e.id} size={34} />
                    </button>
                  ))}
                </div>
              </>
            )}
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
