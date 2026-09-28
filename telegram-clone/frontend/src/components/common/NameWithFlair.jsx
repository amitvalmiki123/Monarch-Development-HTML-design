import PremiumBadge from './PremiumBadge';
import LottieEmoji from './LottieEmoji';

// Renders a display name with the three FairyChat Premium "flair" perks a
// contact might have set, in Telegram's own order: coloured name text,
// then the emoji status, then the premium star badge. Used everywhere a
// name is shown (chat list, chat header, group sender name, profile).
//
// `user.statusEmoji` stores one of our bundled Lottie animated-emoji ids
// (see data/premiumData.js STATUS_EMOJIS / src/assets/lottie-emoji) so this
// renders a real looping animation next to the name, not a static Unicode
// character — this is what makes the "Emoji Status" perk actually look and
// feel like a premium feature instead of just another plain emoji.
export default function NameWithFlair({ name, user, badgeSize = 13, statusSize = 15, className, style }) {
  if (!user) return <span className={className} style={style}>{name}</span>;
  return (
    <span className={className} style={style}>
      <span style={user.nameColor ? { color: user.nameColor } : undefined}>{name}</span>
      {user.statusEmoji && <LottieEmoji id={user.statusEmoji} size={statusSize} className="name-flair-status" />}
      {user.isPremium && <PremiumBadge size={badgeSize} />}
    </span>
  );
}
