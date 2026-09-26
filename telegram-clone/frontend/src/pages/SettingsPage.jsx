import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/common/Avatar';
import { useAuth } from '../context/AuthContext';
import { useTheme, WALLPAPERS } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import { EMOJI_CATEGORIES, REACTION_CHOICES, DEFAULT_QUICK_REACTIONS } from '../data/emojiData';
import http from '../api/http';
import { pushStatus, initNotifications, registerPushIfConfigured, sendLocalTestNotification, sendServerTestPush } from '../utils/notifications';

function Row({ icon, iconColor = 'blue', label, sub, right, onClick, danger }) {
  return (
    <div className={`settings-row${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <span className={`settings-row__icon--badge icon-badge--${iconColor}`}>{icon}</span>
      <div className="settings-row__text">
        <div className="settings-row__label" style={danger ? { color: 'var(--danger)' } : undefined}>{label}</div>
        {sub && <div className="settings-row__sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button className={`switch${checked ? ' on' : ''}`} onClick={onChange}>
      <span className="switch__knob" />
    </button>
  );
}

function NotificationDiagnostics() {
  const [open, setOpen] = useState(false);
  const [, forceRender] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const refresh = async () => {
    setBusy(true);
    setLastResult(null);
    try {
      await initNotifications();
      await registerPushIfConfigured(http);
    } finally {
      forceRender((n) => n + 1);
      setBusy(false);
    }
  };

  const openPanel = async () => {
    setOpen((v) => !v);
    if (!open) await refresh();
  };

  const testLocal = async () => {
    setBusy(true);
    try {
      await sendLocalTestNotification();
      setLastResult({ ok: true, text: 'Local notification sent — check your notification tray now.' });
    } catch (e) {
      setLastResult({ ok: false, text: e.message });
    } finally {
      setBusy(false);
      forceRender((n) => n + 1);
    }
  };

  const testServer = async () => {
    setBusy(true);
    try {
      const data = await sendServerTestPush(http);
      setLastResult({
        ok: data.sent > 0,
        text: data.sent > 0
          ? `Sent to ${data.sent} device(s) — check your notification tray (this can take a few seconds).`
          : `Failed: ${data.errors?.join(', ') || 'no devices reachable'}`
      });
    } catch (e) {
      setLastResult({ ok: false, text: e.response?.data?.error || e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Row
        icon="🔔"
        iconColor="orange"
        label="Notifications"
        sub="Tap to check status and send a test notification"
        onClick={openPanel}
      />
      {open && (
        <div className="danger-confirm-box" style={{ borderColor: 'var(--border-soft)' }}>
          <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
            <div>Platform: <b>{pushStatus.isNative ? 'Native app' : 'Web/PWA'}</b></div>
            <div>Local alert permission: <b>{pushStatus.localPermission}</b></div>
            <div>Server push configured: <b>{pushStatus.serverEnabled === null ? 'checking…' : pushStatus.serverEnabled ? 'yes' : 'no'}</b></div>
            {pushStatus.serverError && <div style={{ color: 'var(--danger)' }}>Server error: {pushStatus.serverError}</div>}
            <div>Device registered for push: <b>{pushStatus.tokenRegistered ? 'yes' : 'not yet'}</b></div>
            {pushStatus.lastError && <div style={{ color: 'var(--danger)' }}>Last error: {pushStatus.lastError}</div>}
          </div>
          {lastResult && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: lastResult.ok ? 'var(--gold-light)' : 'var(--danger)' }}>
              {lastResult.text}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ flex: '1 1 auto', background: 'var(--bg-elevated)', boxShadow: 'none', fontSize: 12.5, padding: '8px 10px' }} disabled={busy} onClick={refresh}>
              Re-check status
            </button>
            <button className="btn-primary" style={{ flex: '1 1 auto', background: 'var(--bg-elevated)', boxShadow: 'none', fontSize: 12.5, padding: '8px 10px' }} disabled={busy} onClick={testLocal}>
              Send local test
            </button>
            <button className="btn-primary btn-gold" style={{ flex: '1 1 auto', fontSize: 12.5, padding: '8px 10px' }} disabled={busy || !pushStatus.serverEnabled} onClick={testServer}>
              Send real push test
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function EditableRow({ icon, iconColor, label, value, placeholder, type = 'text', onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const save = async () => {
    await onSave(draft.trim());
    setEditing(false);
  };

  if (!editing) {
    return (
      <Row
        icon={icon}
        iconColor={iconColor}
        label={value || placeholder}
        sub={label}
        onClick={() => { setDraft(value || ''); setEditing(true); }}
        right={<span className="settings-row__edit">✎</span>}
      />
    );
  }

  return (
    <div className="settings-row">
      <span className={`settings-row__icon--badge icon-badge--${iconColor}`}>{icon}</span>
      <div className="settings-row__text">
        <div className="settings-row__sub">{label}</div>
        <input
          className="profile-inline-input"
          type={type}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        />
      </div>
      <button className="settings-row__edit" onClick={save}>✓</button>
    </div>
  );
}

export default function SettingsPage({ onOpenSaved }) {
  const { logout, user, updateProfile, accounts, switchAccount, forgetAccount, deleteAccount } = useAuth();
  const { theme, toggleTheme, wallpaper, setWallpaper } = useTheme();
  const { chats } = useChat();
  const navigate = useNavigate();
  const [hiddenCategories, setHiddenCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('monarch_hidden_emoji_categories') || '[]'); } catch { return []; }
  });
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const savedChat = chats.find((c) => c.type === 'saved');
  const quickReactions = user?.quickReactions?.length ? user.quickReactions : DEFAULT_QUICK_REACTIONS;
  const otherAccounts = accounts.filter((a) => a.user.id !== user?.id);

  const toggleCategory = (catId) => {
    setHiddenCategories((prev) => {
      // Always keep at least one category visible in the emoji picker.
      if (!prev.includes(catId) && prev.length >= EMOJI_CATEGORIES.length - 1) return prev;
      const next = prev.includes(catId) ? prev.filter((p) => p !== catId) : [...prev, catId];
      localStorage.setItem('monarch_hidden_emoji_categories', JSON.stringify(next));
      return next;
    });
  };

  const toggleReaction = (emoji) => {
    const has = quickReactions.includes(emoji);
    let next;
    if (has) {
      next = quickReactions.filter((e) => e !== emoji);
    } else {
      if (quickReactions.length >= 8) return;
      next = [...quickReactions, emoji];
    }
    updateProfile({ quickReactions: next });
  };

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

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Settings</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-profile-head">
          <Avatar name={user?.name} color={user?.avatarColor} photoUrl={user?.avatarUrl} size={62} />
          <div>
            <div className="settings-profile-head__name">{user?.name}</div>
            <div className="settings-profile-head__sub">
              {user?.phone ? `${user.phone} • ` : ''}@{user?.username}
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Account</div>
          <EditableRow icon="👤" iconColor="blue" label="Profile Name" value={user?.name} placeholder="Add your name" onSave={(v) => v && updateProfile({ name: v })} />
          <EditableRow icon="ℹ️" iconColor="green" label="Bio" value={user?.bio} placeholder="Add a bio" onSave={(v) => updateProfile({ bio: v })} />
          <EditableRow icon="🎂" iconColor="pink" label="Birthday" value={user?.birthday} placeholder="Add Birthday" type="date" onSave={(v) => updateProfile({ birthday: v })} />
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
          <Row icon="➕" iconColor="blue" label="Add Another Account" sub="Sign in or register with a different account" onClick={() => navigate('/login?addAccount=1')} />
          <Row icon="🚪" iconColor="red" label="Log Out" onClick={() => logout()} danger />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Chat Settings</div>
          <div className="settings-row" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span className="settings-row__icon--badge icon-badge--orange">🖼️</span>
              <div className="settings-row__text">
                <div className="settings-row__label">Chat Wallpaper</div>
                <div className="settings-row__sub">Choose a background for your chats</div>
              </div>
            </div>
            <div className="wallpaper-grid">
              {WALLPAPERS.map((w) => (
                <button
                  key={w.id}
                  className={`wallpaper-swatch wallpaper-swatch--${w.id}${wallpaper === w.id ? ' active' : ''}`}
                  onClick={() => setWallpaper(w.id)}
                  title={w.label}
                >
                  {wallpaper === w.id && <span className="wallpaper-swatch__check">✓</span>}
                </button>
              ))}
            </div>
          </div>
          <Row
            icon={theme === 'dark' ? '🌙' : '☀️'}
            iconColor="orange"
            label="Night Mode"
            sub={theme === 'dark' ? 'On' : 'Off'}
            right={<Switch checked={theme === 'dark'} onChange={toggleTheme} />}
          />
          <Row icon="🔖" iconColor="blue" label="Saved Messages" sub="Send notes and files to yourself" onClick={() => savedChat && onOpenSaved(savedChat.id)} />
          <NotificationDiagnostics />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Stickers &amp; Emoji</div>
          <Row
            icon="🧩"
            iconColor="purple"
            label="Stickers"
            sub="Real, animated Telegram-style stickers — search or browse trending in the Stickers tab"
          />
          <div style={{ padding: '2px 16px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
            Tap a category below to show or hide it in the Emoji tab.
          </div>
          {EMOJI_CATEGORIES.map((cat) => (
            <Row
              key={cat.id}
              icon={cat.icon}
              iconColor="gray"
              label={cat.label}
              onClick={() => toggleCategory(cat.id)}
              right={<Switch checked={!hiddenCategories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />}
            />
          ))}
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Message Reactions</div>
          <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
            Pick up to 8 emoji for your quick-react bar (long-press a message to use it).
          </div>
          <div className="reaction-manage-grid">
            {REACTION_CHOICES.map((e) => (
              <button
                key={e}
                className={`reaction-manage-btn${quickReactions.includes(e) ? ' active' : ''}`}
                onClick={() => toggleReaction(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section__title">About</div>
          <Row icon="👑" iconColor="gold" label="FairyChat" sub="v1.0 — your own private messaging platform" />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Danger Zone</div>
          {!deleting ? (
            <Row
              icon="🗑️"
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
