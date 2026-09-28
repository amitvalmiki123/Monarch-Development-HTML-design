import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import {
  UserGlyphIcon, InfoIcon, CakeIcon, AddPersonIcon, LogoutIcon,
  TrashIcon, CrownIcon, ShieldIcon, ChatBubbleGlyphIcon, PuzzleIcon
} from '../components/common/SettingsIcons';
import NameWithFlair from '../components/common/NameWithFlair';
import { Row, EditableRow } from './settings/shared';
import ChatSettingsPage from './settings/ChatSettingsPage';
import PrivacySecurityPage from './settings/PrivacySecurityPage';
import StickersEmojiPage from './settings/StickersEmojiPage';
import PremiumSettingsPage from './settings/PremiumSettingsPage';

// Top-level Settings screen. Rather than one very long scrolling page with
// every option expanded inline, each major group is its own dedicated
// sub-page (Telegram-style drill-down navigation) — tapping a row below
// pushes a full new page (with its own back arrow) instead of expanding in
// place. This keeps the main list short and each sub-page focused.
export default function SettingsPage({ onOpenSaved }) {
  const { logout, user, updateProfile, accounts, switchAccount, forgetAccount, deleteAccount } = useAuth();
  const { chats } = useChat();
  const navigate = useNavigate();
  const [view, setView] = useState('home'); // home | premium | privacy | chat | stickers
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const savedChat = chats.find((c) => c.type === 'saved');
  const otherAccounts = accounts.filter((a) => a.user.id !== user?.id);

  const handleRemoveSavedAccount = (e, userId, name) => {
    e.stopPropagation();
    if (confirm(`Remove "${name}" from this device's account switcher? You can always log back in with its password.`)) {
      forgetAccount(userId);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAccount();
      navigate('/login', { replace: true });
    } catch (err) {
      alert('Could not delete account: ' + (err.response?.data?.error || err.message));
      setDeleting(false);
    }
  };

  if (view === 'premium') return <PremiumSettingsPage onBack={() => setView('home')} />;
  if (view === 'privacy') return <PrivacySecurityPage onBack={() => setView('home')} />;
  if (view === 'chat') return <ChatSettingsPage onBack={() => setView('home')} savedChat={savedChat} onOpenSaved={onOpenSaved} />;
  if (view === 'stickers') return <StickersEmojiPage onBack={() => setView('home')} />;

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Settings</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-profile-head">
          <Avatar name={user?.name} color={user?.avatarColor} photoUrl={user?.avatarUrl} size={62} />
          <div>
            <div className="settings-profile-head__name"><NameWithFlair name={user?.name} user={user} badgeSize={15} /></div>
            <div className="settings-profile-head__sub">
              {user?.phone ? `${user.phone} • ` : ''}@{user?.username}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Account</div>
          <EditableRow icon={<UserGlyphIcon />} iconColor="blue" label="Profile Name" value={user?.name} placeholder="Add your name" onSave={(v) => v && updateProfile({ name: v })} />
          <EditableRow icon={<InfoIcon />} iconColor="green" label="Bio" value={user?.bio} placeholder="Add a bio" onSave={(v) => updateProfile({ bio: v })} />
          <EditableRow icon={<CakeIcon />} iconColor="pink" label="Birthday" value={user?.birthday} placeholder="Add Birthday" type="date" onSave={(v) => updateProfile({ birthday: v })} />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Accounts</div>
          <div className="account-switch-row account-switch-row--active">
            <Avatar name={user?.name} color={user?.avatarColor} photoUrl={user?.avatarUrl} size={38} />
            <div className="settings-row__text">
              <div className="settings-row__label">{user?.name}</div>
              <div className="settings-row__sub">@{user?.username} · this device</div>
            </div>
            <span className="account-switch-row__check">✓</span>
          </div>
          {otherAccounts.map((a) => (
            <div key={a.user.id} className="account-switch-row clickable" onClick={() => switchAccount(a.user.id)}>
              <Avatar name={a.user.name} color={a.user.avatarColor} photoUrl={a.user.avatarUrl} size={38} />
              <div className="settings-row__text">
                <div className="settings-row__label">{a.user.name}</div>
                <div className="settings-row__sub">@{a.user.username} · tap to switch</div>
              </div>
              <button className="account-switch-row__remove" onClick={(e) => handleRemoveSavedAccount(e, a.user.id, a.user.name)}>✕</button>
            </div>
          ))}
          <Row icon={<AddPersonIcon />} iconColor="blue" label="Add Another Account" sub="Sign in or register with a different account" onClick={() => navigate('/login?addAccount=1')} />
          <Row icon={<LogoutIcon />} iconColor="red" label="Log Out" onClick={() => logout()} danger />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">FairyChat</div>
          <Row
            icon={<CrownIcon />}
            iconColor="gold"
            label="FairyChat Premium"
            sub={user?.isPremium ? 'Active — manage your perks' : 'Unlock badges, colours, animated emoji & more'}
            onClick={() => setView('premium')}
            right={<span className="settings-row__chevron">›</span>}
          />
          <Row
            icon={<ShieldIcon />}
            iconColor="purple"
            label="Privacy and Security"
            sub="Passcode lock, two-step verification, sessions"
            onClick={() => setView('privacy')}
            right={<span className="settings-row__chevron">›</span>}
          />
          <Row
            icon={<ChatBubbleGlyphIcon />}
            iconColor="orange"
            label="Chat Settings"
            sub="Wallpaper, night mode, notifications, saved messages"
            onClick={() => setView('chat')}
            right={<span className="settings-row__chevron">›</span>}
          />
          <Row
            icon={<PuzzleIcon />}
            iconColor="pink"
            label="Stickers & Emojis"
            sub="Stickers, emoji categories, animated emojis, reactions"
            onClick={() => setView('stickers')}
            right={<span className="settings-row__chevron">›</span>}
          />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">About</div>
          <Row icon={<CrownIcon />} iconColor="gold" label="FairyChat" sub="v1.0 — your own private messaging platform" />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Danger Zone</div>
          {!deleting ? (
            <Row
              icon={<TrashIcon />}
              iconColor="red"
              label="Delete Account"
              sub="Permanently deletes your account. This cannot be undone."
              onClick={() => setDeleting(true)}
              danger
            />
          ) : (
            <div className="danger-confirm-box">
              <div style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 4 }}>Delete your account permanently?</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
                Your profile, phone number and username will be erased. Your past messages will stay
                visible to others but show as sent by "Deleted Account". Type <b>DELETE</b> to confirm.
              </div>
              <input
                className="profile-inline-input"
                style={{ border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1, background: 'var(--bg-elevated)', boxShadow: 'none' }} onClick={() => { setDeleting(false); setDeleteConfirmText(''); }}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  style={{ flex: 1, background: 'var(--danger)', boxShadow: 'none' }}
                  disabled={deleteConfirmText.trim().toUpperCase() !== 'DELETE'}
                  onClick={handleDeleteAccount}
                >
                  Delete Forever
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
