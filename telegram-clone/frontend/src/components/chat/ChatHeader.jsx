import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../common/Avatar';
import { formatLastSeen } from '../../utils/format';
import { useChat } from '../../context/ChatContext';

const ICON_BY_TYPE = { group: '👥 ', channel: '📢 ', saved: '🔖 ' };

function ChatOptionsMenu({ chat, onBack }) {
  const { toggleMuteChat, clearChatHistory, deleteChat } = useChat();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const isGroupLike = chat.type === 'group' || chat.type === 'channel';
  const leaveLabel = chat.type === 'channel' ? 'Leave channel' : 'Leave group';

  const run = async (fn) => {
    setOpen(false);
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  const handleMute = () => run(() => toggleMuteChat(chat.id));
  const handleWallpaper = () => run(async () => navigate('/settings'));
  const handleClear = () => run(async () => {
    if (window.confirm('Clear all messages in this chat? This only removes them from your view.')) {
      await clearChatHistory(chat.id);
    }
  });
  const handleDeleteOrLeave = () => run(async () => {
    const msg = isGroupLike ? `${leaveLabel}?` : 'Delete this chat? This can\'t be undone.';
    if (window.confirm(msg)) {
      await deleteChat(chat.id);
      onBack?.();
    }
  });

  if (chat.type === 'saved') return null;

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((v) => !v)} disabled={busy} title="Chat options">⋮</button>
      {open && (
        <div className="top-menu">
          <button className="top-menu__item" onClick={handleMute}>
            <span>{chat.muted ? '🔔' : '🔕'}</span> {chat.muted ? 'Unmute' : 'Mute'}
          </button>
          {!isGroupLike && (
            <button className="top-menu__item" onClick={handleWallpaper}>
              <span>🖼️</span> Change Wallpaper
            </button>
          )}
          <button className="top-menu__item" onClick={handleClear}>
            <span>🧹</span> Clear History
          </button>
          <div className="top-menu__divider" />
          <button className="top-menu__item top-menu__item--danger" onClick={handleDeleteOrLeave}>
            <span>{isGroupLike ? '🚪' : '🗑️'}</span> {isGroupLike ? leaveLabel : 'Delete chat'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatHeader({ chat, typingNames, onBack, onShowInfo }) {
  const isDirect = chat.type === 'direct';
  let statusLine;
  if (typingNames && typingNames.length > 0) {
    statusLine = `${typingNames.join(', ')} typing...`;
  } else if (chat.type === 'group') {
    statusLine = `${chat.members.length} members`;
  } else if (chat.type === 'channel') {
    statusLine = `${chat.subscriberCount ?? chat.members.length} subscribers${chat.canPost ? ' • You can post' : ' • Read-only'}`;
  } else if (chat.type === 'saved') {
    statusLine = 'Just for you';
  } else {
    statusLine = formatLastSeen(chat.peer?.status, chat.peer?.lastSeen);
  }

  return (
    <div className="chat-header">
      <button className="icon-btn back-btn" onClick={onBack}>←</button>
      <Avatar name={chat.name} color={chat.avatarColor} photoUrl={chat.peer?.avatarUrl} size={42} showStatus={isDirect} status={chat.peer?.status} />
      <div className="chat-header__info" onClick={onShowInfo} style={{ cursor: 'pointer' }}>
        <div className="chat-header__name">{ICON_BY_TYPE[chat.type] || ''}{chat.name}{chat.muted ? ' 🔕' : ''}</div>
        <div className="chat-header__status" style={{ color: typingNames?.length ? 'var(--gold-light)' : undefined }}>{statusLine}</div>
      </div>
      <ChatOptionsMenu chat={chat} onBack={onBack} />
    </div>
  );
}
