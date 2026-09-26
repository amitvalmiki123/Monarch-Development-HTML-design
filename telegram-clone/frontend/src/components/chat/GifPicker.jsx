import { useEffect, useState } from 'react';
import { useChat } from '../../context/ChatContext';

// Content-only GIF search + grid, meant to be embedded as the "GIFs" tab of
// <EmojiGifStickerPicker>. No outer floating box / click-outside handling —
// the parent picker owns that.
export default function GifPicker({ onSelect }) {
  const { searchGifs, trendingGifs } = useChat();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const run = query.trim() ? searchGifs(query.trim()) : trendingGifs();
    run.then((data) => {
      if (!active) return;
      setConfigured(data.configured !== false);
      setGifs(data.results || []);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [query, searchGifs, trendingGifs]);

  return (
    <div className="emg-gif-tab">
      <div className="field-inline" style={{ marginBottom: 8 }}>
        <input
          autoFocus
          placeholder="Search GIFs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!configured && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: '14px 6px', lineHeight: 1.6 }}>
          🎞️ GIF search isn't set up yet. The backend admin needs to add a free Giphy/Klipy API key
          (<code>GIF_API_KEY</code> env variable — see <code>telegram-clone/README.md</code>).
        </div>
      )}

      {configured && loading && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>Loading...</div>
      )}

      {configured && !loading && gifs.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>No GIFs found</div>
      )}

      {configured && !loading && gifs.length > 0 && (
        <div className="gif-grid">
          {gifs.map((g) => (
            <button key={g.id} className="gif-grid__item" onClick={() => onSelect(g)} title={g.title}>
              <img src={g.previewUrl || g.url} alt={g.title || 'GIF'} loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
