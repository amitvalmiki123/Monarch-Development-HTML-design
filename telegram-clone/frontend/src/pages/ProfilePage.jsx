import { useRef, useState } from 'react';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { uploadFile } = useChat();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const startEdit = () => {
    setName(user.name);
    setBio(user.bio || '');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() || user.name, bio: bio.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const res = await uploadFile(file);
      await updateProfile({ avatarUrl: res.url });
    } catch (err) {
      alert('Photo upload nahi ho payi: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Profile</h1>
        <button className="icon-btn" onClick={editing ? save : startEdit} disabled={saving} title={editing ? 'Save' : 'Edit'}>
          {saving ? '…' : editing ? '✓' : '✎'}
        </button>
      </div>

      <div className="profile-hero">
        <div className="profile-hero__avatar" onClick={() => fileInputRef.current?.click()}>
          <Avatar name={user.name} color={user.avatarColor} photoUrl={user.avatarUrl} size={104} />
          <div className="profile-hero__camera">{uploadingPhoto ? '…' : '📷'}</div>
        </div>
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoPick} />

        {!editing ? (
          <>
            <div className="profile-hero__name">{user.name}</div>
            <div className="profile-hero__status">online</div>
          </>
        ) : (
          <input
            className="profile-hero__name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aapka naam"
            autoFocus
          />
        )}
      </div>

      <div className="settings-scroll">
        <div className="settings-section">
          {user.phone && <Row icon="📱" label={user.phone} sub="Mobile" />}
          <Row icon="@" label={`@${user.username}`} sub="Username" />
          {!editing ? (
            <Row icon="ℹ️" label={user.bio || 'Bio add karein'} sub="Bio" />
          ) : (
            <div className="settings-row">
              <span className="settings-row__icon">ℹ️</span>
              <div className="settings-row__text" style={{ width: '100%' }}>
                <div className="settings-row__sub">Bio</div>
                <input
                  className="profile-inline-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Apne baare me kuch likhein..."
                />
              </div>
            </div>
          )}
        </div>

        {editing && (
          <div style={{ padding: '4px 16px' }}>
            <button className="btn-primary" style={{ background: 'var(--bg-elevated)', boxShadow: 'none', width: '100%' }} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, sub }) {
  return (
    <div className="settings-row">
      <span className="settings-row__icon">{icon}</span>
      <div className="settings-row__text">
        <div className="settings-row__label">{label}</div>
        {sub && <div className="settings-row__sub">{sub}</div>}
      </div>
    </div>
  );
}
