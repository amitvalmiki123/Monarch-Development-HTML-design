import { useState } from 'react';
import Avatar from '../common/Avatar';
import { useChat } from '../../context/ChatContext';
import { isNativeApp, readDeviceContacts } from '../../utils/contacts';

// Reads the phone's address book (Android/iOS app only — a website has no
// way to access it), sends just the phone numbers to the backend, and shows
// which of them are already on Monarch Chat so the user can start chatting
// in one tap. Nothing except phone numbers ever leaves the device.
export default function ContactsSyncPanel({ onStartChat }) {
  const { matchContacts, createDirectChat } = useChat();
  const [status, setStatus] = useState('idle'); // idle | scanning | done | error | denied
  const [error, setError] = useState('');
  const [matches, setMatches] = useState([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [busyId, setBusyId] = useState(null);

  const native = isNativeApp();

  const scan = async () => {
    setStatus('scanning');
    setError('');
    try {
      const deviceContacts = await readDeviceContacts();
      const phones = Array.from(new Set(deviceContacts.map((c) => c.phone).filter(Boolean)));
      setScannedCount(phones.length);
      const found = await matchContacts(phones);
      setMatches(found);
      setStatus('done');
    } catch (e) {
      const msg = e?.message || '';
      if (/OS-PLUG-CONT|denied|permission/i.test(msg)) {
        setStatus('denied');
      } else {
        setStatus('error');
        setError(msg || 'Contacts padhne me error aaya');
      }
    }
  };

  const startChat = async (user) => {
    setBusyId(user.id);
    try {
      const chat = await createDirectChat(user.id);
      onStartChat(chat.id);
    } finally {
      setBusyId(null);
    }
  };

  if (!native) {
    return (
      <div style={{ padding: '18px 6px', color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>
        📱 Contact sync sirf installed Android/iOS app me kaam karta hai — web browser ke paas phone ke contacts padhne ki permission nahi hoti. Monarch Chat app khol kar yahan se try karein.
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 2px' }}>
      {status === 'idle' && (
        <>
          <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
            Apne phone ke contacts se dekhein kaun pehle se Monarch Chat pe hai. Sirf phone numbers check kiye jaate hain — naam ya kisi aur detail ko kahin bheja/save nahi kiya jaata.
          </div>
          <button className="btn-primary btn-gold" onClick={scan}>📱 Contacts Scan Karein</button>
        </>
      )}

      {status === 'scanning' && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 16, textAlign: 'center' }}>Contacts check ho rahe hain...</div>
      )}

      {status === 'denied' && (
        <div>
          <div className="auth-error">Contacts permission nahi mili. Phone ki Settings → Apps → Monarch Chat → Permissions me jaakar Contacts allow karein.</div>
          <button className="btn-primary" style={{ marginTop: 10, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={scan}>Dobara Try Karein</button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <div className="auth-error">{error}</div>
          <button className="btn-primary" style={{ marginTop: 10, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={scan}>Dobara Try Karein</button>
        </div>
      )}

      {status === 'done' && (
        <>
          <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginBottom: 10 }}>
            {scannedCount} contacts check kiye — {matches.length} Monarch Chat pe mile
          </div>
          <div className="modal-list">
            {matches.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: 8 }}>Aapke contacts me se koi bhi abhi Monarch Chat use nahi kar raha</div>
            )}
            {matches.map((u) => (
              <div key={u.id} className="user-pick-row" onClick={() => startChat(u)}>
                <Avatar name={u.name} color={u.avatarColor} photoUrl={u.avatarUrl} size={40} />
                <div>
                  <div className="name">{u.name}</div>
                  <div className="sub">@{u.username}</div>
                </div>
                {busyId === u.id && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>...</span>}
              </div>
            ))}
          </div>
          <button className="btn-primary" style={{ marginTop: 12, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={scan}>🔄 Dobara Scan Karein</button>
        </>
      )}
    </div>
  );
}
