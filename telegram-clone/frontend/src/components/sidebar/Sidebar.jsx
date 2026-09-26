import { useMemo, useState } from 'react';
import ChatListItem from './ChatListItem';
import NewChatModal from './NewChatModal';
import ProfileDrawer from './ProfileDrawer';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export default function Sidebar({ activeChatId, onSelectChat }) {
  const { user } = useAuth();
  const { chats, chatsLoaded } = useChat();
  const [query, setQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.trim().toLowerCase();
    return chats.filter((c) => c.name?.toLowerCase().includes(q));
  }, [chats, query]);

  return (
    <div className="sidebar">
      <div className="sidebar__topbar">
        <button className="icon-btn" onClick={() => setShowProfile(true)} title="Meri profile">
          <Avatar name={user.name} color={user.avatarColor} size={38} />
        </button>
        <div className="brand">
          <div className="brand__crest">M</div>
          <h1>Monarch Chat</h1>
        </div>
        <button className="icon-btn" onClick={() => setShowNewChat(true)} title="Nayi chat">✚</button>
      </div>

      <div className="sidebar__search">
        <input placeholder="Chats me dhoondein..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="chat-list">
        {chatsLoaded && filtered.length === 0 && (
          <div className="empty-state">
            <div className="glyph">💬</div>
            <div>Koi chat nahi hai</div>
            <div style={{ fontSize: 12.5 }}>✚ dabakar nayi baatcheet shuru karein</div>
          </div>
        )}
        {filtered.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            active={chat.id === activeChatId}
            currentUserId={user.id}
            onClick={() => onSelectChat(chat.id)}
          />
        ))}
      </div>

      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} onChatReady={(chatId) => onSelectChat(chatId)} />
      )}
      {showProfile && <ProfileDrawer onClose={() => setShowProfile(false)} />}
    </div>
  );
}
