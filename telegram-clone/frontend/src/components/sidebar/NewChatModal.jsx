import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import ContactsSyncPanel from './ContactsSyncPanel';
import { useChat } from '../../context/ChatContext';

export default function NewChatModal({ onClose, onChatReady, initialMode = 'direct' }) {
  const { searchUsers, createDirectChat, createGroupChat, createChannelChat } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]); // array of user objects
  const [mode, setMode] = useState(initialMode); // direct | group | channel | contacts
  const [step, setStep] = useState('search'); // search | name-group | name-channel
  const [groupName, setGroupName] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const groupMode = mode === 'group' || mode === 'channel';

  useEffect(() => {
    let active = true;
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      searchUsers(query).then((users) => { if (active) setResults(users); }).finally(() => setLoading(false));
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [query, searchUsers]);

  const toggleSelect = (user) => {
    setSelected((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
  };

  const handleUserClick = async (user) => {
    if (groupMode) { toggleSelect(user); return; }
    setBusy(true);
    setError('');
    try {
      const chat = await createDirectChat(user.id);
      onChatReady(chat.id);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not start chat');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { setError('Enter a group name'); return; }
    setBusy(true);
    setError('');
    try {
      const chat = await createGroupChat(groupName.trim(), selected.map((u) => u.id));
      onChatReady(chat.id);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not create group');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) { setError('Enter a channel name'); return; }
    setBusy(true);
    setError('');
    try {
      const chat = await createChannelChat(channelName.trim(), channelDesc.trim(), selected.map((u) => u.id));
      onChatReady(chat.id);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not create channel');
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    search: mode === 'direct' ? 'New Chat' : mode === 'group' ? 'New Group — Choose Members' : mode === 'channel' ? 'New Channel — Choose Subscribers (optional)' : 'Sync From Contacts',
    'name-group': 'Name Your Group',
    'name-channel': 'Channel Details'
  };

  return (
    <Modal title={titles[step]} onClose={onClose}>
      {step === 'search' && (
        <>
          <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '9px 4px', fontSize: 11.5, background: mode === 'direct' ? undefined : 'var(--bg-elevated)', color: mode === 'direct' ? undefined : 'var(--text-secondary)', boxShadow: mode === 'direct' ? undefined : 'none' }}
              onClick={() => setMode('direct')}
            >
              Direct
            </button>
            <button
              className="btn-primary btn-gold"
              style={{ flex: 1, padding: '9px 4px', fontSize: 11.5, opacity: mode === 'group' ? 1 : 0.55 }}
              onClick={() => setMode('group')}
            >
              👥 Group
            </button>
            <button
              className="btn-primary btn-gold"
              style={{ flex: 1, padding: '9px 4px', fontSize: 11.5, opacity: mode === 'channel' ? 1 : 0.55 }}
              onClick={() => setMode('channel')}
            >
              📢 Channel
            </button>
            <button
              className="btn-primary btn-gold"
              style={{ flex: 1, padding: '9px 4px', fontSize: 11.5, opacity: mode === 'contacts' ? 1 : 0.55 }}
              onClick={() => setMode('contacts')}
            >
              📱 Contacts
            </button>
          </div>

          {mode === 'contacts' ? (
            <ContactsSyncPanel onStartChat={(chatId) => { onChatReady(chatId); onClose(); }} />
          ) : (
            <>
              {mode === 'channel' && (
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                  Only you (the owner) can post in a channel — anyone you add as a subscriber can only read, like a broadcast.
                </div>
              )}

              <div className="field-inline">
                <input
                  autoFocus
                  placeholder="Search by username, name or phone..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              {error && <div className="auth-error">{error}</div>}

              {groupMode && selected.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {selected.map((u) => (
                    <span key={u.id} style={{ background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer' }} onClick={() => toggleSelect(u)}>
                      {u.name} ✕
                    </span>
                  ))}
                </div>
              )}

              <div className="modal-list">
                {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Searching...</div>}
                {!loading && query.trim() && results.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>No users found</div>
                )}
                {results.map((u) => (
                  <div key={u.id} className={`user-pick-row${selected.find((s) => s.id === u.id) ? ' selected' : ''}`} onClick={() => handleUserClick(u)}>
                    <Avatar name={u.name} color={u.avatarColor} photoUrl={u.avatarUrl} size={40} />
                    <div>
                      <div className="name">{u.name}</div>
                      <div className="sub">@{u.username}</div>
                    </div>
                    {groupMode && (
                      <input type="checkbox" readOnly checked={!!selected.find((s) => s.id === u.id)} />
                    )}
                  </div>
                ))}
              </div>

              {mode === 'group' && (
                <button className="btn-primary btn-gold" style={{ marginTop: 14 }} disabled={selected.length === 0} onClick={() => setStep('name-group')}>
                  Next ({selected.length} selected)
                </button>
              )}
              {mode === 'channel' && (
                <button className="btn-primary btn-gold" style={{ marginTop: 14 }} onClick={() => setStep('name-channel')}>
                  Next {selected.length > 0 ? `(${selected.length} subscriber${selected.length > 1 ? 's' : ''})` : ''}
                </button>
              )}
            </>
          )}
        </>
      )}

      {step === 'name-group' && (
        <>
          <div className="field-inline">
            <label>Group name</label>
            <input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Family, Office Team" />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={() => setStep('search')}>Back</button>
            <button className="btn-primary btn-gold" disabled={busy} onClick={handleCreateGroup}>
              {busy ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </>
      )}

      {step === 'name-channel' && (
        <>
          <div className="field-inline">
            <label>Channel name</label>
            <input autoFocus value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="e.g. FairyChat Announcements" />
          </div>
          <div className="field-inline">
            <label>Description (optional)</label>
            <input value={channelDesc} onChange={(e) => setChannelDesc(e.target.value)} placeholder="What is this channel about..." />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={() => setStep('search')}>Back</button>
            <button className="btn-primary btn-gold" disabled={busy} onClick={handleCreateChannel}>
              {busy ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
