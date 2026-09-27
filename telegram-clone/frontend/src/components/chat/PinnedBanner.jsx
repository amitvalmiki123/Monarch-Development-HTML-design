function pinnedPreviewText(message) {
  if (!message) return '';
  if (message.deleted) return 'Deleted message';
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'gif') return '🎞️ GIF';
  if (message.type === 'sticker') return '🧩 Sticker';
  if (message.type === 'video') return '🎬 Video';
  if (message.type === 'audio') return '🎙️ Audio message';
  if (message.type === 'file') return '📎 File';
  return message.content || 'Media message';
}

export default function PinnedBanner({ message, onJump, onUnpin }) {
  return (
    <div className="pinned-banner" onClick={onJump}>
      <span className="pinned-banner__icon">📌</span>
      <div className="pinned-banner__body">
        <div className="pinned-banner__label">Pinned Message</div>
        <div className="pinned-banner__text">{pinnedPreviewText(message)}</div>
      </div>
      <button className="pinned-banner__close" onClick={(e) => { e.stopPropagation(); onUnpin(); }} title="Unpin" aria-label="Unpin">✕</button>
    </div>
  );
}
