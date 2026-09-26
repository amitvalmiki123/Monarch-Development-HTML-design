import Avatar from '../common/Avatar';
import { formatLastSeen } from '../../utils/format';

export default function ChatHeader({ chat, typingNames, onBack, onShowInfo }) {
  const isGroup = chat.type === 'group';
  let statusLine;
  if (typingNames && typingNames.length > 0) {
    statusLine = `${typingNames.join(', ')} type kar rahe hain...`;
  } else if (isGroup) {
    statusLine = `${chat.members.length} members`;
  } else {
    statusLine = formatLastSeen(chat.peer?.status, chat.peer?.lastSeen);
  }

  return (
    <div className="chat-header">
      <button className="icon-btn back-btn" onClick={onBack}>←</button>
      <Avatar name={chat.name} color={chat.avatarColor} size={42} showStatus={!isGroup} status={chat.peer?.status} />
      <div className="chat-header__info" onClick={onShowInfo} style={{ cursor: 'pointer' }}>
        <div className="chat-header__name">{isGroup ? '👥 ' : ''}{chat.name}</div>
        <div className="chat-header__status" style={{ color: typingNames?.length ? 'var(--gold-light)' : undefined }}>{statusLine}</div>
      </div>
    </div>
  );
}
