import { useState } from 'react';
import Avatar from '../common/Avatar';
import { useAuth } from '../../context/AuthContext';

export default function ProfileDrawer({ onClose }) {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile({ name, bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ background: 'transparent', backdropFilter: 'none' }} />
      <div className="profile-drawer">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Meri Profile</h3>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="big-avatar" style={{ background: user.avatarColor }}>
          {name?.trim()?.[0]?.toUpperCase() || '?'}
        </div>

        <div className="field-inline">
          <label>Naam</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field-inline">
          <label>Username</label>
          <input value={`@${user.username}`} disabled />
        </div>
        {user.phone && (
          <div className="field-inline">
            <label>Phone</label>
            <input value={user.phone} disabled />
          </div>
        )}
        <div className="field-inline">
          <label>Bio</label>
          <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Apne baare me kuch likhein..." />
        </div>

        <button className="btn-primary btn-gold" onClick={save} disabled={saving} style={{ marginTop: 6 }}>
          {saving ? 'Save ho raha hai...' : saved ? 'Save ho gaya ✓' : 'Profile Save Karein'}
        </button>

        <button
          className="btn-primary"
          style={{ marginTop: 12, background: 'rgba(239,107,107,0.15)', color: '#ffb3b3', boxShadow: 'none' }}
          onClick={logout}
        >
          Logout
        </button>
      </div>
    </>
  );
}
