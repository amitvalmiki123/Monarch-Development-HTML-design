import { useEffect, useRef, useState } from 'react';
import lottie from 'lottie-web';

// Renders one animated emoji from FairyChat Premium's 720-emoji "Animated
// Emojis" pack (src/assets/lottie-emoji-premium/ — Google Noto Animated
// Emoji, CC BY 4.0, see THIRD_PARTY_NOTICE.md there).
//
// Distinct from the free-tier <LottieEmoji> (src/assets/lottie-emoji/) which
// is a much smaller curated set used for Emoji Status / message emoji.
//
// Only mounts the actual Lottie player once the emoji has scrolled into the
// viewport (IntersectionObserver) — the full pack has hundreds of emoji per
// category, and instantiating all of them at once would be very heavy.
export default function PremiumLottieEmoji({ id, size = 40, loop = true }) {
  const wrapRef = useRef(null);
  const containerRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!wrapRef.current || inView) return undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setInView(true);
      },
      { rootMargin: '200px' }
    );
    obs.observe(wrapRef.current);
    return () => obs.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView || !containerRef.current) return undefined;
    let anim;
    let cancelled = false;
    // Served as plain static files from /public (not bundled by Vite) so the
    // 720-file, ~56MB pack never gets pulled into the JS build or the PWA's
    // precache manifest — each emoji is only fetched (and then browser/SW
    // cached, see the /premium-emoji/ runtimeCaching rule in vite.config.js)
    // the first time it actually scrolls into view.
    fetch(`/premium-emoji/${id}.json`)
      .then((res) => { if (!res.ok) throw new Error('not found'); return res.json(); })
      .then((data) => {
        if (cancelled || !containerRef.current) return;
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop,
          autoplay: true,
          animationData: data
        });
      })
      .catch(() => { /* unknown id — render nothing rather than crash */ });
    return () => { cancelled = true; anim?.destroy(); };
  }, [inView, id, loop]);

  return (
    <span ref={wrapRef} style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}>
      {inView && <span ref={containerRef} style={{ width: '100%', height: '100%', display: 'inline-block' }} />}
    </span>
  );
}
