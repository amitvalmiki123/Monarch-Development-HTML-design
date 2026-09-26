import { useRef } from 'react';
import Avatar from '../common/Avatar';
import { formatMessageTime } from '../../utils/format';

function lastMessagePreview(chat) {
  const lm = chat.lastMessage;
  if (!lm) {
    if (chat.type === 'saved') return 'Save your notes, files and links here';
    if (chat.type === 'channel') return 'No posts yet — send the first broadcast';
    return 'No messages yet — say hello to start';
  }
  if (lm.deleted) return 'This message was deleted';
  if (lm.type === 'image') return '📷 Photo';
  if (lm.type === 'gif') return '🎞️ GIF';
  if (lm.type === 'sticker') return lm.fileUrl ? '🧩 Sticker' : `${lm.content || '🌟'} Sticker`;
  if (lm.type === 'video') return '🎬 Video';
  if (lm.type === 'audio') return '🎙️ Audio message';
  if (lm.type === 'file') return '📎 File';
  return lm.content || '';
}

const ICON_BY_TYPE = { group: '👥 ', channel: '📢 ', saved: '🔖 ' };
const LONG_PRESS_MS = 420;

export default function ChatListItem({ chat, active, onClick, onLongPress, selected, selectionMode, currentUserId }) {
  const isDirect = chat.type === 'direct';
  const statusUser = isDirect ? chat.peer : null;
  const lm = chat.lastMessage;

  const timerRef = useRef(null);
  const firedRef = useRef(false);

  const start = () => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      onLongPress?.();
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  const handleClick = () => {
    if (firedRef.current) {
      firedRef.current = false;
      return;
    }
    onClick();
  };

  return (
    <div
      className={`chat-list-item${active ? ' active' : ''}${selected ? ' selected' : ''}`}
      onClick={handleClick}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchMove={cancel}
      onTouchCancel={cancel}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onContextMenu={(e) => { e.preventDefault(); if (!firedRef.current) { firedRef.current = true; onLongPress?.(); } }}
    >
      {selectionMode && (
        <span className={`chat-list-item__checkbox${selected ? ' checked' : ''}`}>{selected ? '✓' : ''}</span>
      )}
      <Avatar
        name={chat.name}
        color={chat.avatarColor}
        photoUrl={statusUser?.avatarUrl}
        showStatus={isDirect && !selectionMode}
        status={statusUser?.status}
      />
      <div className="chat-list-item__body">
        <div className="chat-list-item__top">
          <span className="chat-list-item__name">
            {chat.pinned && <span className="chat-list-item__pin" title="Pinned">📌</span>}
            {ICON_BY_TYPE[chat.type] || ''}{chat.name}
          </span>
          {lm && <span className="chat-list-item__time">{formatMessageTime(lm.createdAt)}</span>}
        </div>
        <div className="chat-list-item__bottom">
          <span className="chat-list-item__preview">
            {lm && lm.senderId === currentUserId && !lm.deleted ? 'You: ' : ''}
            {lastMessagePreview(chat)}
          </span>
          {chat.muted && <span className="chat-list-item__muted" title="Muted">🔕</span>}
          {chat.unreadCount > 0 && <span className="chat-list-item__unread">{chat.unreadCount}</span>}
        </div>
      </div>
    </div>
  );
}
