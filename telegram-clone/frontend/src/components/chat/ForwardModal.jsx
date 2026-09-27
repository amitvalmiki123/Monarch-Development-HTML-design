import { useState } from 'react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { useChat } from '../../context/ChatContext';

// Simple "Forward to..." picker: pick one or more of your existing chats,
// each gets its own copy of the message(s) sent as a brand new message
// authored by you.
export default function ForwardModal({ messageIds, onClose }) {
  const { chats, forwardMessage } = useChat();
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const toggle = (chatId) => {
    setSelected((prev) => (prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]));
  };

  const handleSend = async () => {
    if (selected.length === 0) return;
    setBusy(true);
    setError('');
    try {
      for (const messageId of messageIds) {
        // eslint-disable-next-line no-await-in-loop
        await forwardMessage(messageId, selected);
      }
      setDone(true);
      setTimeout(onClose, 700);
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Could not forward message');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Forward to..." onClose={onClose} width={420}>
      {error && <div className="auth-error">{error}</div>}
      {done ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--gold-light)' }}>Forwarded ✓</div>
      ) : (
        <>
          <div className="modal-list">
            {chats.filter((c) => c.type !== 'channel' || c.canPost).map((chat) => (
              <div key={chat.id} className={`user-pick-row${selected.includes(chat.id) ? ' selected' : ''}`} onClick={() => toggle(chat.id)}>
                <Avatar name={chat.name} color={chat.avatarColor} photoUrl={chat.peer?.avatarUrl} size={38} />
                <div className="name">{chat.name}</div>
                <input type="checkbox" checked={selected.includes(chat.id)} readOnly />
              </div>
            ))}
          </div>
          <button className="btn-primary btn-gold" disabled={busy || selected.length === 0} onClick={handleSend} style={{ marginTop: 14, width: '100%' }}>
            {busy ? 'Forwarding...' : `Forward${selected.length ? ` (${selected.length})` : ''}`}
          </button>
        </>
      )}
    </Modal>
  );
}
