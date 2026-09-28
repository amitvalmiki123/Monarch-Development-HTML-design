import PremiumBadge from './PremiumBadge';

// Renders a display name with the three FairyChat Premium "flair" perks a
// contact might have set, in Telegram's own order: coloured name text,
// then the emoji status, then the premium star badge. Used everywhere a
// name is shown (chat list, chat header, group sender name, profile).
export default function NameWithFlair({ name, user, badgeSize = 13, className, style }) {
  if (!user) return <span className={className} style={style}>{name}</span>;
  return (
    <span className={className} style={style}>
      <span style={user.nameColor ? { color: user.nameColor } : undefined}>{name}</span>
      {user.statusEmoji && <span style={{ marginLeft: 4 }}>{user.statusEmoji}</span>}
      {user.isPremium && <PremiumBadge size={badgeSize} />}
    </span>
  );
}
