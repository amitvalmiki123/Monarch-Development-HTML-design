import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../context/ChatContext';

export default function GifPicker({ onSelect, onClose }) {
  const { searchGifs, trendingGifs } = useChat();
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const boxRef = useRef(null);

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

  useEffect(() => {
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  return (
    <div ref={boxRef} className="gif-picker">
      <div className="field-inline" style={{ marginBottom: 8 }}>
        <input
          autoFocus
          placeholder="GIF dhoondein..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!configured && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: '14px 6px', lineHeight: 1.6 }}>
          🎞️ GIF search abhi set up nahi hai. Backend admin ko ek free Giphy/Klipy API key add karni hogi
          (<code>GIF_API_KEY</code> env variable — dekhein <code>telegram-clone/README.md</code>).
        </div>
      )}

      {configured && loading && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>Load ho raha hai...</div>
      )}

      {configured && !loading && gifs.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 12.5, padding: 14, textAlign: 'center' }}>Koi GIF nahi mila</div>
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
