import Avatar from '../common/Avatar';
import { formatLastSeen } from '../../utils/format';

const ICON_BY_TYPE = { group: '👥 ', channel: '📢 ', saved: '🔖 ' };

export default function ChatHeader({ chat, typingNames, onBack, onShowInfo }) {
  const isDirect = chat.type === 'direct';
  let statusLine;
  if (typingNames && typingNames.length > 0) {
    statusLine = `${typingNames.join(', ')} type kar rahe hain...`;
  } else if (chat.type === 'group') {
    statusLine = `${chat.members.length} members`;
  } else if (chat.type === 'channel') {
    statusLine = `${chat.subscriberCount ?? chat.members.length} subscribers${chat.canPost ? ' • Aap post kar sakte hain' : ' • Sirf padhne ke liye'}`;
  } else if (chat.type === 'saved') {
    statusLine = 'Sirf aapke liye';
  } else {
    statusLine = formatLastSeen(chat.peer?.status, chat.peer?.lastSeen);
  }

  return (
    <div className="chat-header">
      <button className="icon-btn back-btn" onClick={onBack}>←</button>
      <Avatar name={chat.name} color={chat.avatarColor} size={42} showStatus={isDirect} status={chat.peer?.status} />
      <div className="chat-header__info" onClick={onShowInfo} style={{ cursor: 'pointer' }}>
        <div className="chat-header__name">{ICON_BY_TYPE[chat.type] || ''}{chat.name}</div>
        <div className="chat-header__status" style={{ color: typingNames?.length ? 'var(--gold-light)' : undefined }}>{statusLine}</div>
      </div>
    </div>
  );
}
