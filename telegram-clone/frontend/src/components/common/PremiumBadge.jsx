import { useEffect, useRef } from 'react';

// Small badge shown next to a FairyChat Premium member's name — wherever a
// name (or the app's own name, for the top sidebar header) appears: chat
// list, chat header, group sender name, profile page, Settings. Styles to
// choose from in Settings -> FairyChat Premium -> Profile Badge:
//
//  - 'star' (default): the classic gold star, FairyChat's own take on
//    Telegram's Premium star — a plain static SVG.
//  - 'verified': a real Lottie animation (not just a CSS spin) — a teal
//    scalloped checkmark badge that pops in and loops (the pop-in/hold
//    portion only — its source animation ends with a shrink-to-nothing
//    outro, which is skipped via a custom loop segment so the badge never
//    disappears mid-loop).
//  - 'pink-magic': a pink sparkle/twinkle emblem with a soft glow + orbiting
//    magic sparks, looping.
//  - 'flame': a layered red/orange/yellow flame emblem with a soft glow +
//    orbiting embers, looping.
//
// All Lottie variants are FairyChat's own original vector artwork (see
// src/assets/badges/THIRD_PARTY_NOTICE.md for how the base animation motion
// they reuse was sourced) — none of them reproduce any other app's or
// franchise's actual copyrighted badge/logo artwork.
const LOTTIE_VARIANTS = {
  // loopSegment restricts playback to [inFrame, outFrame] instead of the full
  // timeline — used for 'verified' because its source file's last ~17 frames
  // shrink the badge down to nothing (a one-shot "success pop" outro) which
  // would otherwise make the badge flash blank on every loop.
  verified: { asset: () => import('../../assets/badges/verified-badge.json'), label: 'Verified', loopSegment: [0, 73] },
  'pink-magic': { asset: () => import('../../assets/badges/pink-magic.json'), label: 'Magic Sparkle' },
  flame: { asset: () => import('../../assets/badges/flame.json'), label: 'Flame' },
  'fairy-wings': { asset: () => import('../../assets/badges/fairy-wings.json'), label: 'Fairy Wings' },
  'fair-icon': { asset: () => import('../../assets/badges/fair-icon.json'), label: 'Fair Icon' }
};

export default function PremiumBadge({ size = 13, style, variant = 'star' }) {
  const common = { display: 'inline-block', verticalAlign: 'middle', marginLeft: 3, flexShrink: 0, ...style };

  const lottieVariant = LOTTIE_VARIANTS[variant];
  if (lottieVariant) {
    return (
      <LottiePremiumBadge
        size={size}
        style={common}
        loadAsset={lottieVariant.asset}
        label={lottieVariant.label}
        loopSegment={lottieVariant.loopSegment}
      />
    );
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

function LottiePremiumBadge({ size, style, loadAsset, label, loopSegment }) {
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
        loop: !loopSegment,
        autoplay: !loopSegment,
        animationData: dataMod.default || dataMod
      });
      if (loopSegment) {
        anim.playSegments([loopSegment], true);
      }
    }).catch(() => { /* asset missing — render nothing rather than crash */ });
    return () => { cancelled = true; anim?.destroy(); };
  }, [loadAsset, loopSegment]);

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
