import { useEffect } from 'react';
import { DEFAULT_QUICK_REACTIONS } from '../../data/emojiData';
import { pushBackHandler, popBackHandler } from '../../utils/backStack';

// Replaces the old hover-only ".msg-actions" row (which, on a phone, had no
// real anchor and rendered pinned to the very top of the screen instead of
// near the tapped message — a genuine CSS positioning bug, not just an
// ugly layout). A fixed bottom sheet sidesteps that whole class of bug
// entirely: it never needs to compute an on-screen anchor point near the
// tapped bubble (which is hard to get right close to the edges of the
// screen), and is a completely standard, familiar mobile pattern.
export default function MessageActionSheet({
  message, isOwn, isPinned, quickReactions, canEdit, currentUserId,
  onClose, onReact, onReply, onCopy, onForward, onPin, onUnpin, onEdit, onDelete, onSelect
}) {
  const hasText = message.type === 'text' && !!message.content;

  // Whichever emoji `currentUserId` already reacted with (if any) so it can
  // be highlighted — tapping that SAME emoji again removes the reaction
  // (the backend already toggles it off; this just makes it visible/obvious
  // which one is currently "yours" so tapping it again to undo it is clear).
  const activeEmoji = Object.entries(message.reactions || {}).find(
    ([, users]) => Array.isArray(users) && users.includes(currentUserId)
  )?.[0];

  // Let the Android back button close the sheet instead of minimizing the app.
  useEffect(() => {
    pushBackHandler(onClose);
    return () => popBackHandler(onClose);
  }, [onClose]);

  const run = (fn) => () => { fn?.(); onClose(); };

  return (
    <div className="modal-overlay action-sheet-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="action-sheet">
        <div className="action-sheet__reactions">
          {(quickReactions?.length ? quickReactions : DEFAULT_QUICK_REACTIONS).map((emoji) => (
            <button
              key={emoji}
              className={`action-sheet__reaction${emoji === activeEmoji ? ' action-sheet__reaction--active' : ''}`}
              onClick={run(() => onReact(emoji))}
              title={emoji === activeEmoji ? 'Tap again to remove' : undefined}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className="action-sheet__list">
          <button className="action-sheet__item" onClick={run(onReply)}>
            <span className="action-sheet__icon">↩️</span> Reply
          </button>
          {hasText && (
            <button className="action-sheet__item" onClick={run(onCopy)}>
              <span className="action-sheet__icon">📋</span> Copy
            </button>
          )}
          <button className="action-sheet__item" onClick={run(onForward)}>
            <span className="action-sheet__icon">➡️</span> Forward
          </button>
          {isPinned ? (
            <button className="action-sheet__item" onClick={run(onUnpin)}>
              <span className="action-sheet__icon">📌</span> Unpin
            </button>
          ) : (
            <button className="action-sheet__item" onClick={run(onPin)}>
              <span className="action-sheet__icon">📌</span> Pin
            </button>
          )}
          {canEdit && (
            <button className="action-sheet__item" onClick={run(onEdit)}>
              <span className="action-sheet__icon">✎</span> Edit
            </button>
          )}
          <button className="action-sheet__item" onClick={run(onSelect)}>
            <span className="action-sheet__icon">☑️</span> Select
          </button>
          {isOwn && (
            <button className="action-sheet__item action-sheet__item--danger" onClick={run(onDelete)}>
              <span className="action-sheet__icon">🗑️</span> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
