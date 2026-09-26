import { useCallback, useEffect, useState } from 'react';
import Avatar from '../components/common/Avatar';
import ContactsSyncPanel from '../components/sidebar/ContactsSyncPanel';
import { useChat } from '../context/ChatContext';

export default function ContactsPage({ onOpenChat }) {
  const { listContacts, createDirectChat } = useChat();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSync, setShowSync] = useState(false);
  const [query, setQuery] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    listContacts().then(setContacts).finally(() => setLoading(false));
  }, [listContacts]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = contacts.filter((c) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q);
  });

  const openChatWith = async (userId) => {
    const chat = await createDirectChat(userId);
    onOpenChat(chat.id);
  };

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Contacts</h1>
      </div>

      <div className="sidebar__search">
        <input placeholder="Search contacts..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div style={{ padding: '0 16px 10px' }}>
        <button className="btn-primary btn-gold" style={{ width: '100%' }} onClick={() => setShowSync((v) => !v)}>
          {showSync ? '✕ Close' : '📱 Sync From Phone Contacts'}
        </button>
        {showSync && (
          <div style={{ marginTop: 10, background: 'var(--bg-elevated)', borderRadius: 12, padding: 10 }}>
            <ContactsSyncPanel onStartChat={(chatId) => { setShowSync(false); onOpenChat(chatId); refresh(); }} />
          </div>
        )}
      </div>

      <div className="chat-list">
        {loading && <div className="empty-state"><div>Loading...</div></div>}
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="glyph">👥</div>
            <div>No saved contacts yet</div>
            <div style={{ fontSize: 12.5 }}>Start a new chat or sync your contacts</div>
          </div>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="user-pick-row" style={{ padding: '10px 16px' }} onClick={() => openChatWith(c.id)}>
            <Avatar name={c.name} color={c.avatarColor} photoUrl={c.avatarUrl} size={44} showStatus status={c.status} />
            <div>
              <div className="name">{c.name}</div>
              <div className="sub">@{c.username}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
