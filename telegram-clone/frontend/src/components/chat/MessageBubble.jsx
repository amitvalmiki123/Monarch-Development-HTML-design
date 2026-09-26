import { useState } from 'react';
import { formatMessageTime, formatFileSize } from '../../utils/format';
import { resolveMediaUrl } from '../../utils/resolveUrl';

function Ticks({ read, pending, failed }) {
  if (failed) return <span title="Bhejne me fail hua" style={{ color: 'var(--danger)' }}>⚠</span>;
  if (pending) return <span title="Bheja ja raha hai">🕓</span>;
  return <span className={`ticks${read ? ' read' : ''}`} title={read ? 'Padh liya gaya' : 'Bheja gaya'}>{read ? '✓✓' : '✓'}</span>;
}

function FilePreview({ message }) {
  const fileUrl = resolveMediaUrl(message.fileUrl);
  if (message.type === 'image') {
    return <img className="msg-image" src={fileUrl} alt={message.fileName || 'photo'} onClick={() => window.open(fileUrl, '_blank')} />;
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

export default function MessageBubble({ message, isOwn, senderName, showSenderName, onReply, onEdit, onDelete, replyPreview }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content || '');

  if (message.deleted) {
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}`}>
        <div className={`bubble ${isOwn ? 'out' : 'in'} deleted`}>Ye message delete kar diya gaya</div>
      </div>
    );
  }

  const submitEdit = () => {
    if (draft.trim() && draft !== message.content) onEdit(message.id, draft.trim());
    setEditing(false);
  };

  return (
    <div className={`bubble-row ${isOwn ? 'out' : 'in'}`}>
      <div className={`bubble ${isOwn ? 'out' : 'in'}`} style={{ opacity: message.pending ? 0.7 : 1 }}>
        {!isOwn && showSenderName && <span className="sender-name">{senderName}</span>}

        {replyPreview && (
          <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 8, marginBottom: 6, opacity: 0.85, fontSize: 12.5 }}>
            <div style={{ fontWeight: 700 }}>{replyPreview.senderName}</div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
              {replyPreview.text}
            </div>
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
      </div>

      {!editing && (
        <div className="msg-actions">
          <button onClick={() => onReply(message)}>↩ Reply</button>
          {isOwn && message.type === 'text' && <button onClick={() => setEditing(true)}>✎ Edit</button>}
          {isOwn && <button onClick={() => onDelete(message.id)}>🗑 Delete</button>}
        </div>
      )}
    </div>
  );
}
