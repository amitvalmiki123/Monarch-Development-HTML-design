// Small gold star badge shown next to a FairyChat Premium member's name —
// wherever a name appears (chat list, chat header, group sender name,
// profile page, Settings) — same idea as Telegram's Premium star.
export default function PremiumBadge({ size = 13, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: 3, flexShrink: 0, ...style }}
      aria-label="FairyChat Premium"
      title="FairyChat Premium"
    >
      <path
        fill="var(--gold, #d9b64c)"
        d="M12 2.5l2.5 4.9 5.4.8-3.9 3.8.9 5.4L12 15l-4.9 2.4.9-5.4-3.9-3.8 5.4-.8L12 2.5z"
      />
    </svg>
  );
}
