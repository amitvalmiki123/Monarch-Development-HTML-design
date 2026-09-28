import { useEffect, useRef } from 'react';

// Small badge shown next to a FairyChat Premium member's name — wherever a
// name (or the app's own name, for the top sidebar header) appears: chat
// list, chat header, group sender name, profile page, Settings. Styles to
// choose from in Settings -> FairyChat Premium -> Profile Badge:
//
//  - 'star' (default): the classic gold star, FairyChat's own take on
//    Telegram's Premium star — a plain static SVG.
//  - 'verified': a real Lottie animation (not just a CSS spin) — a blue
//    checkmark badge that pops in with a shine sweep and loops.
//  - 'pink-magic': a pink sparkle/twinkle emblem with a soft glow + orbiting
//    magic sparks, looping.
//  - 'flame': a layered red/orange/yellow flame emblem with a soft glow +
//    orbiting embers, looping.
//
// All three Lottie variants are FairyChat's own original vector artwork (see
// src/assets/badges/THIRD_PARTY_NOTICE.md for how the base animation motion
// they reuse was sourced) — none of them reproduce any other app's or
// franchise's actual copyrighted badge/logo artwork.
const LOTTIE_VARIANTS = {
  verified: { asset: () => import('../../assets/badges/verified-badge.json'), label: 'Verified' },
  'pink-magic': { asset: () => import('../../assets/badges/pink-magic.json'), label: 'Magic Sparkle' },
  flame: { asset: () => import('../../assets/badges/flame.json'), label: 'Flame' }
};

export default function PremiumBadge({ size = 13, style, variant = 'star' }) {
  const common = { display: 'inline-block', verticalAlign: 'middle', marginLeft: 3, flexShrink: 0, ...style };

  const lottieVariant = LOTTIE_VARIANTS[variant];
  if (lottieVariant) {
    return <LottiePremiumBadge size={size} style={common} loadAsset={lottieVariant.asset} label={lottieVariant.label} />;
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={common} aria-label="FairyChat Premium" title="FairyChat Premium">
      <path
        fill="var(--gold, #d9b64c)"
        d="M12 2.5l2.5 4.9 5.4.8-3.9 3.8.9 5.4L12 15l-4.9 2.4.9-5.4-3.9-3.8 5.4-.8L12 2.5z"
      />
    </svg>
  );
}

function LottiePremiumBadge({ size, style, loadAsset, label }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let anim;
    let cancelled = false;
    Promise.all([import('lottie-web'), loadAsset()]).then(([lottieMod, dataMod]) => {
      if (cancelled || !containerRef.current) return;
      const lottie = lottieMod.default || lottieMod;
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: dataMod.default || dataMod
      });
    }).catch(() => { /* asset missing — render nothing rather than crash */ });
    return () => { cancelled = true; anim?.destroy(); };
  }, [loadAsset]);

  return (
    <span
      ref={containerRef}
      role="img"
      aria-label={label}
      title={label}
      style={{ width: size, height: size, ...style }}
    />
  );
}
