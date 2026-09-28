import { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

// Real, Lottie-quality animated emoji — used by FairyChat Premium's
// "Animated Emojis" and "Emoji Status" perks. Distinct from Telegram's own
// (proprietary, TGS-format) animated emoji: these come from an
// independently-authored, MIT-licensed animation set bundled locally (see
// src/assets/lottie-emoji/THIRD_PARTY_NOTICE.md) and are rendered with the
// open-source `lottie-web` player — no network call, no Telegram content.
export default function LottieEmoji({ id, size = 20, loop = true, className = '' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let anim;
    let cancelled = false;
    import(`../../assets/lottie-emoji/${id}.json`)
      .then((mod) => {
        if (cancelled || !containerRef.current) return;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay: true,
          animationData: mod.default || mod
        });
      })
      .catch(() => { /* unknown id — just render nothing rather than crash */ });
    return () => { cancelled = true; anim?.destroy(); };
  }, [id, loop]);

  return <span ref={containerRef} className={`lottie-emoji ${className}`} style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }} />;
}
