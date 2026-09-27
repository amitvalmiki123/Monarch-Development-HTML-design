import { useState } from 'react';
import { formatMessageTime, formatFileSize } from '../../utils/format';
import { resolveMediaUrl } from '../../utils/resolveUrl';
import { useMessageGestures } from '../../hooks/useMessageGestures';

function Ticks({ read, pending, failed }) {
  if (failed) return <span title="Failed to send" style={{ color: 'var(--danger)' }}>⚠</span>;
  if (pending) return <span title="Sending...">🕓</span>;
  return <span className={`ticks${read ? ' read' : ''}`} title={read ? 'Read' : 'Sent'}>{read ? '✓✓' : '✓'}</span>;
}

function FilePreview({ message }) {
  const fileUrl = resolveMediaUrl(message.fileUrl);
  if (message.type === 'image') {
    return <img className="msg-image" src={fileUrl} alt={message.fileName || 'photo'} onClick={(e) => { e.stopPropagation(); window.open(fileUrl, '_blank'); }} />;
  }
  if (message.type === 'gif') {
    return <img className="msg-image" src={fileUrl} alt={message.fileName || 'GIF'} loading="lazy" onClick={(e) => e.stopPropagation()} />;
  }
  if (message.type === 'video') {
    return <video src={fileUrl} controls style={{ maxWidth: '100%', width: 280, borderRadius: 12, marginBottom: 4 }} onClick={(e) => e.stopPropagation()} />;
  }
  if (message.type === 'audio') {
    return <audio src={fileUrl} controls style={{ marginBottom: 4 }} onClick={(e) => e.stopPropagation()} />;
  }
  return (
    <a href={fileUrl} target="_blank" rel="noreferrer" className="file-chip" onClick={(e) => e.stopPropagation()}>
      <span className="file-icon">📎</span>
      <span>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{message.fileName || 'File'}</div>
        <div style={{ fontSize: 11.5, opacity: 0.75 }}>{formatFileSize(message.fileSize)}</div>
      </span>
    </a>
  );
}

function ReactionPills({ reactions, currentUserId, onToggle }) {
  const entries = Object.entries(reactions || {}).filter(([, users]) => users?.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="reaction-pills">
      {entries.map(([emoji, users]) => (
        <button
          key={emoji}
          className={`reaction-pill${users.includes(currentUserId) ? ' mine' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(emoji); }}
        >
          {emoji} <span>{users.length}</span>
        </button>
      ))}
    </div>
  );
}

export default function MessageBubble({
  message, isOwn, senderName, showSenderName, replyPreview,
  currentUserId, onReact,
  isEditing, editDraft, onEditDraftChange, onSubmitEdit, onCancelEdit,
  isPinned,
  selectionMode, selected, onToggleSelect,
  onOpenActions, onLongPress, onSwipeReply
}) {
  const [localDraft, setLocalDraft] = useState(message.content || '');
  const draft = editDraft ?? localDraft;
  const setDraft = onEditDraftChange || setLocalDraft;

  const { swipeX, handlers } = useMessageGestures({
    disabled: message.deleted,
    onTap: () => {
      if (selectionMode) onToggleSelect?.(message.id);
      else onOpenActions?.(message);
    },
    onLongPress: () => onLongPress?.(message),
    onSwipeReply: () => onSwipeReply?.(message)
  });

  const toggleReaction = (emoji) => onReact?.(message.id, emoji);

  const submitEdit = () => {
    if (draft.trim() && draft !== message.content) onSubmitEdit(message.id, draft.trim());
    else onCancelEdit();
  };

  if (message.deleted) {
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}`}>
        <div className={`bubble ${isOwn ? 'out' : 'in'} deleted`}>This message was deleted</div>
      </div>
    );
  }

  const swipeStyle = swipeX > 0 ? { transform: `translateX(${swipeX}px)` } : undefined;
  const replyHintStyle = { opacity: Math.min(1, swipeX / 40) };

  // Stickers render with no bubble background, same as Telegram: a real
  // animated sticker image (fileUrl, from the Stickers tab) when present,
  // falling back to a big emoji for any older sticker messages that only
  // ever stored a plain emoji character.
  if (message.type === 'sticker') {
    const stickerImg = message.fileUrl ? resolveMediaUrl(message.fileUrl) : null;
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}${selected ? ' row-selected' : ''}`}>
        {selectionMode && <span className={`msg-select-check${selected ? ' checked' : ''}`}>{selected ? '✓' : ''}</span>}
        <span className="swipe-reply-hint" style={replyHintStyle}>↩</span>
        <div className="sticker-bubble" style={swipeStyle} {...handlers}>
          {stickerImg ? (
            <img className="sticker-bubble__img" src={stickerImg} alt={message.fileName || 'Sticker'} loading="lazy" />
          ) : (
            <div className="sticker-bubble__emoji">{message.content}</div>
          )}
          <div className="sticker-bubble__meta">
            {formatMessageTime(message.createdAt)}
            {isOwn && <Ticks read={message.read} pending={message.pending} failed={message.failed} />}
          </div>
          <ReactionPills reactions={message.reactions} currentUserId={currentUserId} onToggle={toggleReaction} />
        </div>
      </div>
    );
  }

  return (
    <div className={`bubble-row ${isOwn ? 'out' : 'in'}${selected ? ' row-selected' : ''}`}>
      {selectionMode && <span className={`msg-select-check${selected ? ' checked' : ''}`}>{selected ? '✓' : ''}</span>}
      <span className="swipe-reply-hint" style={replyHintStyle}>↩</span>
      <div className={`bubble ${isOwn ? 'out' : 'in'}`} style={{ opacity: message.pending ? 0.7 : 1, ...swipeStyle }} {...handlers}>
        {!isOwn && showSenderName && <span className="sender-name">{senderName}</span>}

        {isPinned && <div className="pinned-tag">📌 Pinned</div>}

        {replyPreview && (
          <div className="reply-quote">
            <div className="reply-quote__name">{replyPreview.senderName}</div>
            <div className="reply-quote__text">{replyPreview.text}</div>
          </div>
        )}

        {message.fileUrl && <FilePreview message={message} />}

        {isEditing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ width: '100%', minWidth: 200, background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 8, color: '#fff', padding: 6, fontSize: 14 }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') onCancelEdit(); }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button onClick={submitEdit} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--gold-light)' }}>Save</button>
              <button onClick={onCancelEdit} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </div>
        ) : (
          message.content && <span>{message.content}</span>
        )}

        <div className="meta">
          {message.editedAt && <span>edited</span>}
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOwn && <Ticks read={message.read} pending={message.pending} failed={message.failed} />}
        </div>

        <ReactionPills reactions={message.reactions} currentUserId={currentUserId} onToggle={toggleReaction} />
      </div>
    </div>
  );
}
