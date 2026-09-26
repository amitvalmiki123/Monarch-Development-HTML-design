import { useEffect, useRef, useState } from 'react';
import { formatMessageTime, formatFileSize } from '../../utils/format';
import { resolveMediaUrl } from '../../utils/resolveUrl';
import { DEFAULT_QUICK_REACTIONS } from '../../data/emojiData';

function Ticks({ read, pending, failed }) {
  if (failed) return <span title="Failed to send" style={{ color: 'var(--danger)' }}>⚠</span>;
  if (pending) return <span title="Sending...">🕓</span>;
  return <span className={`ticks${read ? ' read' : ''}`} title={read ? 'Read' : 'Sent'}>{read ? '✓✓' : '✓'}</span>;
}

function FilePreview({ message }) {
  const fileUrl = resolveMediaUrl(message.fileUrl);
  if (message.type === 'image') {
    return <img className="msg-image" src={fileUrl} alt={message.fileName || 'photo'} onClick={() => window.open(fileUrl, '_blank')} />;
  }
  if (message.type === 'gif') {
    return <img className="msg-image" src={fileUrl} alt={message.fileName || 'GIF'} loading="lazy" />;
  }
  if (message.type === 'video') {
    return <video src={fileUrl} controls style={{ maxWidth: 320, borderRadius: 12, marginBottom: 4 }} />;
  }
  if (message.type === 'audio') {
    return <audio src={fileUrl} controls style={{ marginBottom: 4 }} />;
  }
  return (
    <a href={fileUrl} target="_blank" rel="noreferrer" className="file-chip">
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
          onClick={() => onToggle(emoji)}
        >
          {emoji} <span>{users.length}</span>
        </button>
      ))}
    </div>
  );
}

export default function MessageBubble({
  message, isOwn, senderName, showSenderName, onReply, onEdit, onDelete, replyPreview,
  currentUserId, quickReactions, onReact
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content || '');
  const [showReactBar, setShowReactBar] = useState(false);
  const reactBarRef = useRef(null);

  useEffect(() => {
    if (!showReactBar) return;
    const onClickOutside = (e) => {
      if (reactBarRef.current && !reactBarRef.current.contains(e.target)) setShowReactBar(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showReactBar]);

  if (message.deleted) {
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}`}>
        <div className={`bubble ${isOwn ? 'out' : 'in'} deleted`}>This message was deleted</div>
      </div>
    );
  }

  const submitEdit = () => {
    if (draft.trim() && draft !== message.content) onEdit(message.id, draft.trim());
    setEditing(false);
  };

  const toggleReaction = (emoji) => {
    onReact?.(message.id, emoji);
    setShowReactBar(false);
  };

  // Stickers render with no bubble background, same as Telegram: a real
  // animated sticker image (fileUrl, from the Stickers tab) when present,
  // falling back to a big emoji for any older sticker messages that only
  // ever stored a plain emoji character.
  if (message.type === 'sticker') {
    const stickerImg = message.fileUrl ? resolveMediaUrl(message.fileUrl) : null;
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}`}>
        <div className="sticker-bubble">
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
        {!editing && (
          <div className="msg-actions">
            <div className="react-popup-wrap" ref={reactBarRef}>
              <button onClick={() => setShowReactBar((v) => !v)}>😊 React</button>
              {showReactBar && (
                <div className="quick-react-bar">
                  {(quickReactions?.length ? quickReactions : DEFAULT_QUICK_REACTIONS).map((e) => (
                    <button key={e} onClick={() => toggleReaction(e)}>{e}</button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => onReply(message)}>↩ Reply</button>
            {isOwn && <button onClick={() => onDelete(message.id)}>🗑 Delete</button>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bubble-row ${isOwn ? 'out' : 'in'}`}>
      <div className={`bubble ${isOwn ? 'out' : 'in'}`} style={{ opacity: message.pending ? 0.7 : 1 }}>
        {!isOwn && showSenderName && <span className="sender-name">{senderName}</span>}

        {replyPreview && (
          <div className="reply-quote">
            <div className="reply-quote__name">{replyPreview.senderName}</div>
            <div className="reply-quote__text">{replyPreview.text}</div>
          </div>
        )}

        {message.fileUrl && <FilePreview message={message} />}

        {editing ? (
          <div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ width: '100%', minWidth: 200, background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 8, color: '#fff', padding: 6, fontSize: 14 }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') setEditing(false); }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button onClick={submitEdit} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--gold-light)' }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--text-secondary)' }}>Cancel</button>
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

      {!editing && (
        <div className="msg-actions">
          <div className="react-popup-wrap" ref={reactBarRef}>
            <button onClick={() => setShowReactBar((v) => !v)}>😊 React</button>
            {showReactBar && (
              <div className="quick-react-bar">
                {(quickReactions?.length ? quickReactions : DEFAULT_QUICK_REACTIONS).map((e) => (
                  <button key={e} onClick={() => toggleReaction(e)}>{e}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onReply(message)}>↩ Reply</button>
          {isOwn && message.type === 'text' && <button onClick={() => setEditing(true)}>✎ Edit</button>}
          {isOwn && <button onClick={() => onDelete(message.id)}>🗑 Delete</button>}
        </div>
      )}
    </div>
  );
}
