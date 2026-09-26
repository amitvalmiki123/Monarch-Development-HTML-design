import Avatar from '../common/Avatar';
import { formatMessageTime } from '../../utils/format';

function lastMessagePreview(chat) {
  const lm = chat.lastMessage;
  if (!lm) {
    if (chat.type === 'saved') return 'Apne notes, files aur links yahan save karein';
    if (chat.type === 'channel') return 'Koi post nahi — pehla broadcast bhejein';
    return 'Koi message nahi — Namaste bolke shuruaat karein';
  }
  if (lm.deleted) return 'Ye message delete kar diya gaya';
  if (lm.type === 'image') return '📷 Photo';
  if (lm.type === 'gif') return '🎞️ GIF';
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
            {lm && lm.senderId === currentUserId && !lm.deleted ? 'Aap: ' : ''}
            {lastMessagePreview(chat)}
          </span>
          {chat.unreadCount > 0 && <span className="chat-list-item__unread">{chat.unreadCount}</span>}
        </div>
      </div>
    </div>
  );
}
