import { useMemo, useState } from 'react';
import Sidebar from '../components/sidebar/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import BottomNav from '../components/nav/BottomNav';
import ContactsPage from './ContactsPage';
import SettingsPage from './SettingsPage';
import ProfilePage from './ProfilePage';
import { useChat } from '../context/ChatContext';

export default function ChatApp() {
  const { chats, openChat } = useChat();
  const [tab, setTab] = useState('chats');
  const [activeChatId, setActiveChatId] = useState(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const unreadTotal = useMemo(() => chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [chats]);

  const handleSelect = (chatId) => {
    setTab('chats');
    setActiveChatId(chatId);
    openChat(chatId);
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    if (nextTab !== 'chats') setActiveChatId(null);
  };

  const chatOpenOnMobile = tab === 'chats' && !!activeChatId;

  return (
    <div className={`app-root${chatOpenOnMobile ? ' chat-open' : ''}`}>
      <div className="app-content">
        {tab === 'chats' && (
          <div className={`app-shell${activeChatId ? ' chat-open' : ''}`}>
            <Sidebar activeChatId={activeChatId} onSelectChat={handleSelect} />
            {activeChat ? (
              <ChatWindow chat={activeChat} onBack={() => setActiveChatId(null)} />
            ) : (
              <div className="chat-panel">
                <div className="empty-state">
                  <div className="glyph">👑</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Welcome to FairyChat</div>
                  <div style={{ maxWidth: 320 }}>Pick a conversation from the left panel, or use the ⋮ menu to start a new chat.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'contacts' && <ContactsPage onOpenChat={handleSelect} />}
        {tab === 'settings' && <SettingsPage onOpenSaved={handleSelect} />}
        {tab === 'profile' && <ProfilePage />}
      </div>

      <BottomNav active={tab} onChange={handleTabChange} unreadTotal={unreadTotal} />
    </div>
  );
}
