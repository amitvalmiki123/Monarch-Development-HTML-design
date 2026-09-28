import { useEffect, useRef } from 'react';

// Small badge shown next to a FairyChat Premium member's name — wherever a
// name (or the app's own name, for the top sidebar header) appears: chat
// list, chat header, group sender name, profile page, Settings. Two original
// styles to choose from in Settings -> FairyChat Premium -> Profile Badge:
//
//  - 'star' (default): the classic gold star, FairyChat's own take on
//    Telegram's Premium star — a plain static SVG.
//  - 'verified': a real Lottie animation (not just a CSS spin) — a blue
//    checkmark badge that pops in with a shine sweep and loops, giving it a
//    genuine "premium" feel. Built from an independently-authored,
//    MIT-licensed animation (see src/assets/badges/THIRD_PARTY_NOTICE.md),
//    recolored to FairyChat blue — not Telegram's or Instagram's own badge
//    artwork.
export default function PremiumBadge({ size = 13, style, variant = 'star' }) {
  const common = { display: 'inline-block', verticalAlign: 'middle', marginLeft: 3, flexShrink: 0, ...style };

  if (variant === 'verified') {
    return <VerifiedLottieBadge size={size} style={common} />;
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

function VerifiedLottieBadge({ size, style }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    let anim;
    let cancelled = false;
    Promise.all([
      import('lottie-web'),
      import('../../assets/badges/verified-badge.json')
    ]).then(([lottieMod, dataMod]) => {
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
  }, []);

  return (
    <span
      ref={containerRef}
      role="img"
      aria-label="Verified"
      title="Verified"
      style={{ width: size, height: size, ...style }}
    />
  );
}
