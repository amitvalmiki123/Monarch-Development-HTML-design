import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { useChat } from '../../context/ChatContext';

export default function NewChatModal({ onClose, onChatReady }) {
  const { searchUsers, createDirectChat, createGroupChat } = useChat();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]); // array of user objects
  const [groupMode, setGroupMode] = useState(false);
  const [step, setStep] = useState('search'); // search | name-group
  const [groupName, setGroupName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
      setError(e.response?.data?.error || 'Chat shuru nahi ho payi');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) { setError('Group ka naam dein'); return; }
    setBusy(true);
    setError('');
    try {
      const chat = await createGroupChat(groupName.trim(), selected.map((u) => u.id));
      onChatReady(chat.id);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Group nahi ban paya');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={step === 'search' ? (groupMode ? 'Naya Group — Members Chunein' : 'Nayi Chat') : 'Group Ka Naam Rakhein'} onClose={onClose}>
      {step === 'search' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              className="btn-primary"
              style={{ flex: 1, padding: '9px 10px', fontSize: 13, background: groupMode ? 'var(--bg-elevated)' : undefined, color: groupMode ? 'var(--text-secondary)' : undefined, boxShadow: 'none' }}
              onClick={() => setGroupMode(false)}
            >
              Direct Message
            </button>
            <button
              className="btn-primary btn-gold"
              style={{ flex: 1, padding: '9px 10px', fontSize: 13, opacity: groupMode ? 1 : 0.55 }}
              onClick={() => setGroupMode(true)}
            >
              👥 Group Banayein
            </button>
          </div>

          <div className="field-inline">
            <input
              autoFocus
              placeholder="Username, naam ya phone se dhoondein..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          {groupMode && selected.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {selected.map((u) => (
                <span key={u.id} style={{ background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 999, fontSize: 12.5 }}>
                  {u.name} ✕
                </span>
              ))}
            </div>
          )}

          <div className="modal-list">
            {loading && <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Dhundh rahe hain...</div>}
            {!loading && query.trim() && results.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Koi user nahi mila</div>
            )}
            {results.map((u) => (
              <div key={u.id} className={`user-pick-row${selected.find((s) => s.id === u.id) ? ' selected' : ''}`} onClick={() => handleUserClick(u)}>
                <Avatar name={u.name} color={u.avatarColor} size={40} />
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

          {groupMode && (
            <button className="btn-primary btn-gold" style={{ marginTop: 14 }} disabled={selected.length === 0} onClick={() => setStep('name-group')}>
              Aage Badhein ({selected.length} chune gaye)
            </button>
          )}
        </>
      )}

      {step === 'name-group' && (
        <>
          <div className="field-inline">
            <label>Group ka naam</label>
            <input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Family, Office Team" />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-primary" style={{ background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={() => setStep('search')}>Peeche</button>
            <button className="btn-primary btn-gold" disabled={busy} onClick={handleCreateGroup}>
              {busy ? 'Ban raha hai...' : 'Group Banayein'}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
