import { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { PREMIUM_STICKERS } from '../../data/premiumStickers';

// Content-only sticker search + grid, meant to be embedded as the "Stickers"
// tab of <EmojiGifStickerPicker>. Pulls real, animated (GIF/WEBP) stickers
// from the same provider that powers the GIF tab — same UX shape as
// Telegram's own sticker tray — plus FairyChat's own small exclusive
// "Premium" pack up top (visible to everyone, like Telegram's premium
// stickers, but only sendable by Premium accounts).
export default function StickerPicker({ onSelect }) {
  const { user } = useAuth();
  const { searchStickers, trendingStickers } = useChat();
  const [query, setQuery] = useState('');
  const [stickers, setStickers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  const selectPremium = (sticker) => {
    if (user?.isPremium) {
      onSelect(sticker);
    } else {
      alert('⭐ This is a FairyChat Premium sticker. Redeem a Premium code in Settings to send it.');
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    const run = query.trim() ? searchStickers(query.trim()) : trendingStickers();
    run.then((data) => {
      if (!active) return;
      setConfigured(data.configured !== false);
      setStickers(data.results || []);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [query, searchStickers, trendingStickers]);

  return (
    <div className="emg-gif-tab">
      <div style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 2px 4px' }}>⭐ FairyChat Premium</div>
      <div className="sticker-grid" style={{ gridAutoRows: 66, marginBottom: 10 }}>
        {PREMIUM_STICKERS.map((s) => (
          <button
            key={s.id}
            className={`sticker-grid__item${!user?.isPremium ? ' sticker-grid__item--locked' : ''}`}
            onClick={() => selectPremium(s)}
            title={s.title}
          >
            <img src={s.url} alt={s.title} loading="lazy" />
          </button>
        ))}
      </div>

      <div className="field-inline" style={{ marginBottom: 8 }}>
        <input
          autoFocus
          placeholder="Search stickers..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!configured && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: '14px 6px', lineHeight: 1.6 }}>
          🧩 Sticker search isn't set up yet. The backend admin needs to add a free Giphy/Klipy API key
          (<code>GIF_API_KEY</code> env variable — see <code>telegram-clone/README.md</code>).
        </div>
      )}

      {configured && loading && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>Loading...</div>
      )}

      {configured && !loading && stickers.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>No stickers found</div>
      )}

      {configured && !loading && stickers.length > 0 && (
        <div className="sticker-grid">
          {stickers.map((s) => (
            <button key={s.id} className="sticker-grid__item" onClick={() => onSelect(s)} title={s.title}>
              <img src={s.previewUrl || s.url} alt={s.title || 'Sticker'} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
