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
  if (lm.type === 'sticker') return `${lm.content || '🌟'} Sticker`;
  if (lm.type === 'video') return '🎬 Video';
  if (lm.type === 'audio') return '🎙️ Audio message';
  if (lm.type === 'file') return '📎 File';
  return lm.content || '';
}

const ICON_BY_TYPE = { group: '👥 ', channel: '📢 ', saved: '🔖 ' };

export default function ChatListItem({ chat, active, onClick, currentUserId }) {
  const isDirect = chat.type === 'direct';
  const statusUser = isDirect ? chat.peer : null;
  const lm = chat.lastMessage;

  return (
    <div className={`chat-list-item${active ? ' active' : ''}`} onClick={onClick}>
      <Avatar
        name={chat.name}
        color={chat.avatarColor}
        photoUrl={statusUser?.avatarUrl}
        showStatus={isDirect}
        status={statusUser?.status}
      />
      <div className="chat-list-item__body">
        <div className="chat-list-item__top">
          <span className="chat-list-item__name">{ICON_BY_TYPE[chat.type] || ''}{chat.name}</span>
          {lm && <span className="chat-list-item__time">{formatMessageTime(lm.createdAt)}</span>}
        </div>
        <div className="chat-list-item__bottom">
          <span className="chat-list-item__preview">
            {lm && lm.senderId === currentUserId && !lm.deleted ? 'You: ' : ''}
            {lastMessagePreview(chat)}
          </span>
          {chat.unreadCount > 0 && <span className="chat-list-item__unread">{chat.unreadCount}</span>}
        </div>
      </div>
    </div>
  );
}
