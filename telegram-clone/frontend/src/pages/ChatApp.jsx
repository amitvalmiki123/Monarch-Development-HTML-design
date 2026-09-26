import { useState } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { useChat } from '../context/ChatContext';

export default function ChatApp() {
  const { chats, openChat } = useChat();
  const [activeChatId, setActiveChatId] = useState(null);

  const activeChat = chats.find((c) => c.id === activeChatId);

  const handleSelect = (chatId) => {
    setActiveChatId(chatId);
    openChat(chatId);
  };

  return (
    <div className={`app-shell${activeChatId ? ' chat-open' : ''}`}>
      <Sidebar activeChatId={activeChatId} onSelectChat={handleSelect} />
      {activeChat ? (
        <ChatWindow chat={activeChat} onBack={() => setActiveChatId(null)} />
      ) : (
        <div className="chat-panel">
          <div className="empty-state">
            <div className="glyph">👑</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Monarch Chat me swagat hai</div>
            <div style={{ maxWidth: 320 }}>Chat shuru karne ke liye left panel se koi baatcheet chunein ya ✚ dabakar nayi chat banayein.</div>
          </div>
        </div>
      )}
    </div>
  );
}
