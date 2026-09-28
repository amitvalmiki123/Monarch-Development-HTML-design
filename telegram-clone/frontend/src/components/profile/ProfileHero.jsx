import { useEffect, useRef, useState } from 'react';
import Avatar from '../common/Avatar';
import { resolveMediaUrl } from '../../utils/resolveUrl';
import { pushBackHandler, popBackHandler } from '../../utils/backStack';
import { CameraGlyphIcon, PencilGlyphIcon } from '../common/SettingsIcons';
import { SettingsIcon } from '../nav/NavIcons';
import { ChevronDownIcon } from './ProfileIcons';
import NameWithFlair from '../common/NameWithFlair';

// Any drag starting from inside these should never trigger the pull-down
// gesture (buttons, the name input while editing, etc.) — same
// stopPropagation pattern used for message-bubble gestures elsewhere.
const stopGesture = {
  onTouchStart: (e) => e.stopPropagation(),
  onMouseDown: (e) => e.stopPropagation()
};

const EXPAND_DISTANCE = 130; // px of drag before it snaps fully open
const OPEN_THRESHOLD = 0.4;

// The Profile screen's top section: collapsed it's the plain
// avatar/name/status/3-buttons block; dragging it downward morphs it into
// a full-bleed photo view of the user's whole profile-photo history
// (Telegram's "pull down the header" gesture) with the name/buttons
// re-rendered as a translucent, blurred bar over the photo.
export default function ProfileHero({
  user, avatarUrl, avatarHistory, hasActiveStory, uploadingPhoto,
  editing, nameValue, onNameChange,
  onAvatarTap, onSetPhoto, onEditInfo, onOpenSettings
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const startRef = useRef(null);
  const swipeStartRef = useRef(null);

  const gallery = avatarHistory && avatarHistory.length > 0 ? avatarHistory : (avatarUrl ? [{ id: 'current', url: avatarUrl }] : []);

  useEffect(() => {
    if (!expanded) return;
    setPhotoIndex(0);
    const close = () => setExpanded(false);
    pushBackHandler(close);
    return () => popBackHandler(close);
  }, [expanded]);

  const onTouchStart = (e) => {
    if (expanded) return;
    const t = e.touches ? e.touches[0] : e;
    startRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchMove = (e) => {
    if (expanded || !startRef.current) return;
    if (e.buttons === 0 && !e.touches) return; // mouse moved without the button held
    const t = e.touches ? e.touches[0] : e;
    const dy = t.clientY - startRef.current.y;
    const dx = t.clientX - startRef.current.x;
    if (dy > 6 && Math.abs(dy) > Math.abs(dx)) {
      setDragging(true);
      setDragY(Math.min(dy, EXPAND_DISTANCE));
      if (e.cancelable) e.preventDefault();
    }
  };

  const onTouchEnd = () => {
    if (dragging && dragY / EXPAND_DISTANCE > OPEN_THRESHOLD) {
      setExpanded(true);
    }
    setDragging(false);
    setDragY(0);
    startRef.current = null;
  };

  const progress = Math.min(1, dragY / EXPAND_DISTANCE);
  const avatarScale = 1 + progress * 0.35;

  const swipeOnStart = (e) => {
    const t = e.touches ? e.touches[0] : e;
    swipeStartRef.current = t.clientX;
  };
  const swipeOnEnd = (e) => {
    if (swipeStartRef.current == null) return;
    const t = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
    const dx = t.clientX - swipeStartRef.current;
    swipeStartRef.current = null;
    if (Math.abs(dx) < 40 || gallery.length < 2) return;
    setPhotoIndex((i) => {
      if (dx < 0) return Math.min(gallery.length - 1, i + 1);
      return Math.max(0, i - 1);
    });
  };

  const actionButtons = (
    <div className="profile-hero__actions" {...stopGesture}>
      <button onClick={onSetPhoto}>
        <span>{uploadingPhoto ? '…' : <CameraGlyphIcon />}</span> Set Photo
      </button>
      <button onClick={onEditInfo}>
        <span><PencilGlyphIcon /></span> Edit Info
      </button>
      <button onClick={onOpenSettings}>
        <span><SettingsIcon active /></span> Settings
      </button>
    </div>
  );

  if (expanded) {
    const photo = gallery[photoIndex] || gallery[0];
    return (
      <div className="profile-hero profile-hero--expanded">
        {gallery.length > 1 && (
          <div className="profile-hero__segments">
            {gallery.map((g, i) => (
              <span key={g.id} className={`profile-hero__segment ${i === photoIndex ? 'is-active' : i < photoIndex ? 'is-past' : ''}`} />
            ))}
          </div>
        )}
        <button className="profile-hero__collapse" onClick={() => setExpanded(false)} {...stopGesture}>
          <ChevronDownIcon />
        </button>
        <div
          className="profile-hero__photo-stage"
          onTouchStart={swipeOnStart}
          onTouchEnd={swipeOnEnd}
          onMouseDown={swipeOnStart}
          onMouseUp={swipeOnEnd}
        >
          {photo && <img src={resolveMediaUrl(photo.url)} alt={user.name} className="profile-hero__photo-img" />}
        </div>
        <div className="profile-hero__scrim">
          <div className="profile-hero__name"><NameWithFlair name={user.name} user={user} badgeSize={15} /></div>
          <div className="profile-hero__status">online</div>
          {actionButtons}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`profile-hero ${dragging ? 'is-dragging' : ''}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onTouchStart}
      onMouseMove={onTouchMove}
      onMouseUp={onTouchEnd}
      onMouseLeave={onTouchEnd}
    >
      <div className="profile-hero__pull-hint" style={{ opacity: progress }}>
        <ChevronDownIcon />
      </div>
      <div
        className={`profile-hero__avatar ${hasActiveStory ? 'has-story-ring' : ''}`}
        style={{ transform: `scale(${avatarScale})` }}
        onClick={onAvatarTap}
        {...stopGesture}
      >
        <Avatar name={user.name} color={user.avatarColor} photoUrl={avatarUrl} size={104} />
        <div className="profile-hero__camera" onClick={(e) => { e.stopPropagation(); onSetPhoto(); }}>
          {uploadingPhoto ? '…' : <CameraGlyphIcon />}
        </div>
      </div>

      {!editing ? (
        <>
          <div className="profile-hero__name"><NameWithFlair name={user.name} user={user} badgeSize={15} /></div>
          <div className="profile-hero__status">online</div>
        </>
      ) : (
        <input
          className="profile-hero__name-input"
          value={nameValue}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Your name"
          autoFocus
          {...stopGesture}
        />
      )}

      {actionButtons}
    </div>
  );
}
