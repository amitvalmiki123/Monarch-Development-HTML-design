import Avatar from './Avatar';

// Drop-in wrapper around <Avatar/> that adds Telegram's colored "has an
// active story" ring when the user has posted something in the last 24h,
// and makes the avatar tappable to view it. Used anywhere a contact's/
// peer's avatar shows up outside the Profile screen itself (which has its
// own richer ProfileHero handling for the current user's own ring).
export default function AvatarWithStory({ user, size = 44, showStatus = false, onOpenStory }) {
  if (!user) return null;
  const ring = !!user.hasActiveStory;
  const content = <Avatar name={user.name} color={user.avatarColor} photoUrl={user.avatarUrl} size={size} showStatus={showStatus} status={user.status} />;
  if (!ring) return content;
  return (
    <span
      className="avatar-story-ring"
      style={{ width: size + 6, height: size + 6 }}
      onClick={(e) => { if (onOpenStory) { e.stopPropagation(); onOpenStory(user.id); } }}
    >
      {content}
    </span>
  );
}
