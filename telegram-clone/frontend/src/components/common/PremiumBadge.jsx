// Small badge shown next to a FairyChat Premium member's name — wherever a
// name appears (chat list, chat header, group sender name, profile page,
// Settings). Two original styles to choose from in Settings -> FairyChat
// Premium -> Profile Badge: the classic gold star (FairyChat's own take on
// Telegram's Premium star), or a blue "verified" checkmark (FairyChat's own
// original design of the same generic checkmark-in-a-badge pattern used
// across Instagram/Twitter/Telegram/etc. — that overall shape/idea isn't
// anyone's proprietary IP, only each platform's exact artwork is).
export default function PremiumBadge({ size = 13, style, variant = 'star' }) {
  const common = { display: 'inline-block', verticalAlign: 'middle', marginLeft: 3, flexShrink: 0, ...style };

  if (variant === 'verified') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" style={common} aria-label="Verified" title="Verified">
        <path
          fill="#3ba7ff"
          d="M12 1.5l2.1 1.9 2.8-.4 1 2.6 2.6 1-.4 2.8 1.9 2.1-1.9 2.1.4 2.8-2.6 1-1 2.6-2.8-.4L12 22.5l-2.1-1.9-2.8.4-1-2.6-2.6-1 .4-2.8L1.9 12l1.9-2.1-.4-2.8 2.6-1 1-2.6 2.8.4L12 1.5z"
        />
        <path fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7.5 12.3l2.7 2.7 6-6.3" />
      </svg>
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
