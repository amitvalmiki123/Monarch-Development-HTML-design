import { useMemo, useState } from 'react';
import ChatListItem from './ChatListItem';
import NewChatModal from './NewChatModal';
import TopMenu from '../nav/TopMenu';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

export default function Sidebar({ activeChatId, onSelectChat }) {
  const { user } = useAuth();
  const { chats, chatsLoaded } = useChat();
  const [query, setQuery] = useState('');
  const [newChatMode, setNewChatMode] = useState(null); // null | 'direct' | 'group' | 'channel'

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const q = query.trim().toLowerCase();
    return chats.filter((c) => c.name?.toLowerCase().includes(q));
  }, [chats, query]);

  return (
    <div className="sidebar">
      <div className="sidebar__topbar">
        <div className="brand">
          <img className="brand__crest" src="/icons/brand-crest.png" alt="FairyChat" />
          <h1>FairyChat</h1>
        </div>
        <TopMenu
          onNewDirect={() => setNewChatMode('direct')}
          onNewGroup={() => setNewChatMode('group')}
          onNewChannel={() => setNewChatMode('channel')}
        />
      </div>

      <div className="sidebar__search">
        <input placeholder="Search chats..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="chat-list">
        {chatsLoaded && filtered.length === 0 && (
          <div className="empty-state">
            <div className="glyph">💬</div>
            <div>No chats yet</div>
            <div style={{ fontSize: 12.5 }}>Use the ⋮ menu to start a new chat</div>
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

      {newChatMode && (
        <NewChatModal initialMode={newChatMode} onClose={() => setNewChatMode(null)} onChatReady={(chatId) => onSelectChat(chatId)} />
      )}
    </div>
  );
}
