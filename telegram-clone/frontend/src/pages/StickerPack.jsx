import { useEffect, useMemo, useRef, useState } from 'react';
import lottie from 'lottie-web';

// FairyChat Birthday sticker pack — 60 Lottie/TGS stickers.
// Purpose: preview every sticker, assign each one an emoji for the
// @stickers bot upload (/newanimated), then copy the full mapping list.
const COUNT = 60;
const EMOJI_CHOICES = ['🎂', '🎉', '🥳', '🎈', '🎁', '🎊', '🍰', '🕯️', '✨', '❤️', '😍', '👏'];

async function loadTgs(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed');
  // .tgs = gzip'd Lottie JSON — decompress in the browser
  const stream = res.body.pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

function StickerCard({ index, onEmoji }) {
  const ref = useRef(null);
  const [emoji, setEmoji] = useState(null);

  useEffect(() => {
    let anim;
    let dead = false;
    loadTgs(`/stickers/birthday/${String(index).padStart(3, '0')}.tgs`)
      .then((data) => {
        if (dead || !ref.current) return;
        anim = lottie.loadAnimation({
          container: ref.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          animationData: data,
        });
      })
      .catch(() => {});
    return () => {
      dead = true;
      if (anim) anim.destroy();
    };
  }, [index]);

  return (
    <div className="sticker-card">
      <div className="sticker-anim" ref={ref} />
      <div className="sticker-num">#{String(index).padStart(3, '0')}</div>
      <div className="sticker-emojis">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            className={`emoji-btn ${emoji === e ? 'active' : ''}`}
            onClick={() => {
              const next = emoji === e ? null : e;
              setEmoji(next);
              onEmoji(index, next);
            }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function StickerPack() {
  const [map, setMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fc_sticker_map') || '{}');
    } catch {
      return {};
    }
  });

  const assigned = useMemo(
    () => Object.values(map).filter(Boolean).length,
    [map]
  );

  const update = (i, emoji) => {
    setMap((prev) => {
      const next = { ...prev, [i]: emoji };
      localStorage.setItem('fc_sticker_map', JSON.stringify(next));
      return next;
    });
  };

  const copyList = () => {
    const lines = [];
    for (let i = 1; i <= COUNT; i++) {
      lines.push(`${String(i).padStart(3, '0')}.tgs → ${map[i] || '__(emoji chuni hai)__'}`);
    }
    navigator.clipboard.writeText(
      `FairyChat Birthday Pack — @stickers upload list (${assigned}/${COUNT} assigned)\n\n` +
        lines.join('\n')
    );
  };

  return (
    <div className="sticker-pack-page">
      <header className="sticker-header">
        <h1>🎂 FairyChat Birthday Sticker Pack</h1>
        <p>
          60 animated Lottie stickers (TGS, 512×512, 3s — Telegram-ready).
          Har sticker ke liye ek emoji chuno (jo @stickers bot upload ke
          time chahiye), phir niche se list copy karke upload karo.
        </p>
        <div className="sticker-progress">
          Assigned: <b>{assigned}/{COUNT}</b>
          <button className="copy-btn" onClick={copyList}>
            📋 Copy upload list
          </button>
        </div>
      </header>
      <div className="sticker-grid">
        {Array.from({ length: COUNT }, (_, k) => (
          <StickerCard key={k + 1} index={k + 1} onEmoji={update} />
        ))}
      </div>
    </div>
  );
}
