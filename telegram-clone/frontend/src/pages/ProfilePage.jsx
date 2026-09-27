import { useEffect, useRef, useState } from 'react';
import http from '../api/http';
import ProfileHero from '../components/profile/ProfileHero';
import PostsSection from '../components/profile/PostsSection';
import StoryViewer from '../components/profile/StoryViewer';
import CameraCapture from '../components/profile/CameraCapture';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { AtIcon, InfoIcon, PhoneIcon } from '../components/common/SettingsIcons';
import { ArchiveIcon, TrashIcon, CheckCircleIcon } from '../components/profile/ProfileIcons';

export default function ProfilePage({ onOpenSettings }) {
  const { user, updateProfile, setAvatar, refreshUser } = useAuth();
  const { uploadFile } = useChat();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

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

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Profile</h1>
        <button className="icon-btn" onClick={editing ? save : startEdit} disabled={saving} title={editing ? 'Save' : 'Edit'}>
          {saving ? '…' : editing ? '✓' : '✎'}
        </button>
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
