import { useEffect, useRef, useState } from 'react';
import Avatar from '../common/Avatar';
import { resolveMediaUrl } from '../../utils/resolveUrl';
import { pushBackHandler, popBackHandler } from '../../utils/backStack';
import { CloseXIcon } from './ProfileIcons';

const PHOTO_DURATION_MS = 5000;

function timeAgo(ts) {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

// Full-screen Instagram/Telegram-style story viewer for the posts made in
// the last 24h (the ones still lighting up the profile-photo ring).
export default function StoryViewer({ user, stories, onClose, manageActions }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const videoRef = useRef(null);
  const pausedRef = useRef(false);

  const current = stories[index];

  useEffect(() => {
    pushBackHandler(onClose);
    return () => popBackHandler(onClose);
  }, [onClose]);

  useEffect(() => {
    setProgress(0);
    if (!current) return;
    if (current.type === 'video') return; // driven by the <video> element instead
    const started = performance.now();
    const tick = (now) => {
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, (now - started) / PHOTO_DURATION_MS);
      setProgress(p);
      if (p >= 1) {
        goNext();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  function goNext() {
    setIndex((i) => {
      if (i >= stories.length - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  }

  function goPrev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  const onTapArea = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.changedTouches ? e.changedTouches[0].clientX : e.clientX) - rect.left;
    if (x < rect.width / 2.6) goPrev();
    else goNext();
  };

  const onTouchStart = (e) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
    pausedRef.current = true;
  };
  const onTouchEnd = (e) => {
    pausedRef.current = false;
    if (!startRef.current) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - startRef.current.y;
    const dx = t.clientX - startRef.current.x;
    startRef.current = null;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      return;
    }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) onTapArea(e);
  };

  if (!current) return null;

  return (
    <div className="story-viewer">
      <div className="story-viewer__bars">
        {stories.map((s, i) => (
          <div key={s.id} className="story-viewer__bar">
            <div
              className="story-viewer__bar-fill"
              style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="story-viewer__header">
        <Avatar name={user.name} color={user.avatarColor} photoUrl={user.avatarUrl} size={34} />
        <div className="story-viewer__header-text">
          <div className="story-viewer__header-name">{user.name}</div>
          <div className="story-viewer__header-time">{timeAgo(current.createdAt)}</div>
        </div>
        <button className="story-viewer__close" onClick={onClose}><CloseXIcon /></button>
      </div>

      <div
        className="story-viewer__stage"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={() => { pausedRef.current = true; }}
        onMouseUp={(e) => { pausedRef.current = false; onTapArea(e); }}
      >
        {current.type === 'video' ? (
          <video
            ref={videoRef}
            src={resolveMediaUrl(current.fileUrl)}
            className="story-viewer__media"
            autoPlay
            playsInline
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress(v.currentTime / v.duration);
            }}
            onEnded={goNext}
          />
        ) : (
          <img src={resolveMediaUrl(current.fileUrl)} alt="" className="story-viewer__media" />
        )}
      </div>

      {current.caption && <div className="story-viewer__caption">{current.caption}</div>}

      {manageActions && (
        <div className="story-viewer__manage-bar" {...({})}>
          {manageActions(current)}
        </div>
      )}
    </div>
  );
}
