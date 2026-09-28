import { useEffect, useRef, useState } from 'react';
import http from '../api/http';
import ProfileHero from '../components/profile/ProfileHero';
import PostsSection from '../components/profile/PostsSection';
import StoryViewer from '../components/profile/StoryViewer';
import CameraCapture from '../components/profile/CameraCapture';
import Modal from '../components/common/Modal';
import ProfileColorPage from './settings/ProfileColorPage';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { AtIcon, InfoIcon, PhoneIcon } from '../components/common/SettingsIcons';
import { ArchiveIcon, TrashIcon, CheckCircleIcon } from '../components/profile/ProfileIcons';
import { saveToGallery } from '../utils/saveToGallery';

export default function ProfilePage({ onOpenSettings }) {
  const { user, updateProfile, setAvatar, removeAvatar, changeUsername, refreshUser } = useAuth();
  const { uploadFile } = useChat();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  // Top-right 3-dot menu (replaces the old pencil button — "Edit" lives in
  // the menu and on the hero's Edit Info button now).
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [menuOpen]);

  // "Change Profile Colour" opens as its own full page (Telegram-style).
  const [showColorPage, setShowColorPage] = useState(false);

  // "Change Username" modal.
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user.username || '');
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameError, setUsernameError] = useState('');

  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [archivedPosts, setArchivedPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [openPost, setOpenPost] = useState(null); // a single post being viewed from the grid
  const [showMyStory, setShowMyStory] = useState(false);
  const [copiedField, setCopiedField] = useState(null);

  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const [mine, archived] = await Promise.all([
        http.get('/users/me/posts'),
        http.get('/users/me/posts', { params: { archived: true } })
      ]);
      setPosts(mine.data.posts);
      setArchivedPosts(archived.data.posts);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => { loadPosts(); }, []); // eslint-disable-line

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
      await setAvatar(res.url);
    } catch (err) {
      alert('Could not upload photo: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // "Remove Photo" from the pulled-down profile-photo viewer — falls back
  // to the previous photo (or the plain initials avatar) server-side.
  const handleRemovePhoto = async (photo) => {
    if (!window.confirm('Remove this profile photo?')) return;
    try {
      await removeAvatar(photo.id);
    } catch (err) {
      alert('Could not remove photo: ' + (err.response?.data?.error || err.message));
    }
  };

  // "Save to Gallery" — share-sheet save on mobile, download fallback on
  // desktop (see utils/saveToGallery.js).
  const handleSavePhoto = async (photo) => {
    try {
      const result = await saveToGallery(photo.url, 'fairychat-profile-photo');
      if (result === 'shared') { /* native sheet already confirms */ }
      else if (result === 'downloaded') alert('Photo saved to your downloads.');
    } catch (err) {
      alert('Could not save photo: ' + (err.response?.data?.error || err.message));
    }
  };

  const openUsernameModal = () => {
    setMenuOpen(false);
    setUsernameDraft(user.username || '');
    setUsernameError('');
    setShowUsernameModal(true);
  };

  const submitUsername = async () => {
    const v = usernameDraft.trim();
    if (!v || v === user.username) { setShowUsernameModal(false); return; }
    setUsernameBusy(true);
    setUsernameError('');
    try {
      await changeUsername(v);
      setShowUsernameModal(false);
    } catch (err) {
      setUsernameError(err.response?.data?.error || err.message);
    } finally {
      setUsernameBusy(false);
    }
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be unavailable (older WebViews) — fall back
      // silently, the visible "Copied" flash still gives feedback either way.
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1400);
  };

  const submitPost = async (blob, type, caption) => {
    const file = blob instanceof File ? blob : new File([blob], `post.${type === 'video' ? 'webm' : 'jpg'}`, { type: blob.type });
    const uploaded = await uploadFile(file);
    await http.post('/users/me/posts', {
      type,
      fileUrl: uploaded.url,
      fileName: uploaded.name,
      fileSize: uploaded.size,
      caption
    });
    await Promise.all([loadPosts(), refreshUser()]);
  };

  const archivePost = async (post, archived) => {
    await http.patch(`/users/me/posts/${post.id}/archive`, { archived });
    setOpenPost(null);
    await Promise.all([loadPosts(), refreshUser()]);
  };

  const deletePost = async (post) => {
    if (!window.confirm('Delete this post? This can\'t be undone.')) return;
    await http.delete(`/users/me/posts/${post.id}`);
    setOpenPost(null);
    await Promise.all([loadPosts(), refreshUser()]);
  };

  // "Change Profile Colour" opens as its own full page (Telegram-style).
  // Kept AFTER every hook above so the hook order stays identical whether
  // or not the sub-page is showing.
  if (showColorPage) {
    return <ProfileColorPage onBack={() => setShowColorPage(false)} />;
  }

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Profile</h1>
        {editing ? (
          <button className="icon-btn" onClick={save} disabled={saving} title="Save">
            {saving ? '…' : '✓'}
          </button>
        ) : (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} title="Profile options">⋮</button>
            {menuOpen && (
              <div className="top-menu">
                <button className="top-menu__item" onClick={() => { setMenuOpen(false); setShowColorPage(true); }}>
                  <span>🎨</span> Change Profile Colour
                </button>
                <button className="top-menu__item" onClick={openUsernameModal}>
                  <span>👤</span> Change Username
                </button>
                <div className="top-menu__divider" />
                <button className="top-menu__item" onClick={() => { setMenuOpen(false); startEdit(); }}>
                  <span>✎</span> Edit Info
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="settings-scroll">
        <ProfileHero
          user={user}
          avatarUrl={user.avatarUrl}
          avatarHistory={user.avatarHistory}
          hasActiveStory={user.hasActiveStory}
          uploadingPhoto={uploadingPhoto}
          editing={editing}
          nameValue={name}
          onNameChange={setName}
          onAvatarTap={() => { if (user.hasActiveStory) setShowMyStory(true); }}
          onSetPhoto={() => fileInputRef.current?.click()}
          onEditInfo={editing ? save : startEdit}
          onOpenSettings={onOpenSettings}
          onRemovePhoto={handleRemovePhoto}
          onSavePhoto={handleSavePhoto}
        />
        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handlePhotoPick} />

        <div className="settings-section">
          {user.phone && (
            <Row
              icon={<PhoneIcon />} iconColor="green" label={user.phone} sub="Mobile"
              onClick={() => copyToClipboard(user.phone, 'phone')} copied={copiedField === 'phone'}
            />
          )}
          <Row
            icon={<AtIcon />} iconColor="orange" label={`@${user.username}`} sub="Username"
            onClick={() => copyToClipboard(user.username, 'username')} copied={copiedField === 'username'}
          />
          {!editing ? (
            user.bio && <Row icon={<InfoIcon />} iconColor="blue" label={user.bio} sub="Bio" />
          ) : (
            <div className="settings-row">
              <span className="settings-row__icon--badge icon-badge--blue"><InfoIcon /></span>
              <div className="settings-row__text" style={{ width: '100%' }}>
                <div className="settings-row__sub">Bio</div>
                <input
                  className="profile-inline-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write something about yourself..."
                />
              </div>
            </div>
          )}
        </div>

        {editing && (
          <div style={{ padding: '4px 16px 12px' }}>
            <button className="btn-primary" style={{ background: 'var(--bg-elevated)', boxShadow: 'none', width: '100%' }} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        )}

        <PostsSection
          tab={tab}
          onTabChange={setTab}
          posts={tab === 'posts' ? posts : archivedPosts}
          loading={postsLoading}
          onAddPost={() => setShowCamera(true)}
          onOpenPost={setOpenPost}
        />
      </div>

      {showCamera && (
        <CameraCapture onClose={() => setShowCamera(false)} onSubmit={submitPost} />
      )}

      {showMyStory && user.storyPosts?.length > 0 && (
        <StoryViewer user={user} stories={user.storyPosts} onClose={() => setShowMyStory(false)} />
      )}

      {openPost && (
        <StoryViewer
          user={user}
          stories={[openPost]}
          onClose={() => setOpenPost(null)}
          manageActions={(post) => (
            <>
              <button onClick={() => archivePost(post, !post.archived)}>
                <ArchiveIcon /> {post.archived ? 'Unarchive' : 'Archive'}
              </button>
              <button onClick={() => deletePost(post)}><TrashIcon /> Delete</button>
            </>
          )}
        />
      )}

      {showUsernameModal && (
        <Modal title="Change Username" onClose={() => setShowUsernameModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 6 }}>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              You can choose a username on FairyChat. If you do, other people will be able to find
              you by this username and contact you without needing your phone number.
            </div>
            <input
              className="profile-inline-input"
              style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '10px 12px', width: '100%' }}
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submitUsername(); }}
              placeholder="username"
              autoFocus
            />
            {usernameError && <div style={{ color: 'var(--danger)', fontSize: 12.5 }}>{usernameError}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn-primary"
                style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }}
                onClick={() => setShowUsernameModal(false)}
                disabled={usernameBusy}
              >
                Cancel
              </button>
              <button className="btn-primary btn-gold" style={{ flex: 1 }} onClick={submitUsername} disabled={usernameBusy || !usernameDraft.trim()}>
                {usernameBusy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Row({ icon, iconColor = 'blue', label, sub, onClick, copied }) {
  return (
    <div className={`settings-row${onClick ? ' clickable' : ''}`} onClick={onClick} title={onClick ? 'Tap to copy' : undefined}>
      <span className={`settings-row__icon--badge icon-badge--${iconColor}`}>{icon}</span>
      <div className="settings-row__text">
        <div className="settings-row__label">{label}</div>
        {sub && <div className="settings-row__sub">{sub}</div>}
      </div>
      {copied && <span className="settings-row__copied"><CheckCircleIcon /> Copied</span>}
    </div>
  );
}
