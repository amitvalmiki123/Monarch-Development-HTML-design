import { useEffect, useMemo, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import Sidebar from '../components/sidebar/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import BottomNav from '../components/nav/BottomNav';
import ConnectionBanner from '../components/common/ConnectionBanner';
import ContactsPage from './ContactsPage';
import SettingsPage from './SettingsPage';
import ProfilePage from './ProfilePage';
import { useChat } from '../context/ChatContext';
import { consumeBack } from '../utils/backStack';

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

  // Android hardware/gesture back button: go back one screen inside the
  // app (any open popup/sheet first, then out of a chat to the chat list,
  // then out of Settings/Contacts/Profile to the chat list) and only exit
  // the app once we're already sitting at that root chat-list screen.
  // Without this listener Capacitor's default is to always minimize/exit
  // the app on every back press, which is the bug being fixed here.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let listenerHandle;
    CapacitorApp.addListener('backButton', () => {
      if (consumeBack()) return;
      if (tab === 'chats' && activeChatId) {
        setActiveChatId(null);
        return;
      }
      if (tab !== 'chats') {
        setTab('chats');
        return;
      }
      CapacitorApp.exitApp();
    }).then((handle) => { listenerHandle = handle; });
    return () => { listenerHandle?.remove(); };
  }, [tab, activeChatId]);

  const chatOpenOnMobile = tab === 'chats' && !!activeChatId;

  return (
    <div className={`app-root${chatOpenOnMobile ? ' chat-open' : ''}`}>
      <ConnectionBanner />
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
        {tab === 'profile' && <ProfilePage onOpenSettings={() => setTab('settings')} />}
      </div>

      <BottomNav active={tab} onChange={handleTabChange} unreadTotal={unreadTotal} />
    </div>
  );
}
