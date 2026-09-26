import { useCallback, useEffect, useState } from 'react';
import Avatar from '../components/common/Avatar';
import ContactsSyncPanel from '../components/sidebar/ContactsSyncPanel';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export default function ContactsPage({ onOpenChat }) {
  const { user } = useAuth();
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

  const inviteFriends = async () => {
    const text = `Chat with me on FairyChat! My username is @${user?.username}.`;
    if (navigator.share) {
      try { await navigator.share({ title: 'FairyChat', text }); } catch { /* user cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      alert('Invite message copied — paste it anywhere to share!');
    } catch {
      alert(text);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Contacts</h1>
      </div>

      <div className="sidebar__search">
        <input placeholder="Search contacts..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div style={{ padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="settings-row clickable" style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 12 }} onClick={inviteFriends}>
          <span className="settings-row__icon--badge icon-badge--blue">👤➕</span>
          <div className="settings-row__text">
            <div className="settings-row__label">Invite Friends</div>
          </div>
        </div>
        <button className="btn-primary btn-gold" style={{ width: '100%' }} onClick={() => setShowSync((v) => !v)}>
          {showSync ? '✕ Close' : '📱 Sync From Phone Contacts'}
        </button>
        {showSync && (
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 12, padding: 10 }}>
            <ContactsSyncPanel onStartChat={(chatId) => { setShowSync(false); onOpenChat(chatId); refresh(); }} />
          </div>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <div className="contacts-sort-label">Sorted alphabetically</div>
      )}

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
