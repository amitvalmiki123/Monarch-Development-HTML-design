import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme, WALLPAPERS } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import { EMOJI_CATEGORIES, REACTION_CHOICES, DEFAULT_QUICK_REACTIONS } from '../data/emojiData';

function Row({ icon, label, sub, right, onClick, danger }) {
  return (
    <div className={`settings-row${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <span className="settings-row__icon">{icon}</span>
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

function EditableRow({ icon, label, value, placeholder, type = 'text', onSave }) {
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
        label={value || placeholder}
        sub={label}
        onClick={() => { setDraft(value || ''); setEditing(true); }}
        right={<span className="settings-row__edit">✎</span>}
      />
    );
  }

  return (
    <div className="settings-row">
      <span className="settings-row__icon">{icon}</span>
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
  const { logout, user, updateProfile } = useAuth();
  const { theme, toggleTheme, wallpaper, setWallpaper } = useTheme();
  const { chats } = useChat();
  const navigate = useNavigate();
  const [hiddenCategories, setHiddenCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('monarch_hidden_emoji_categories') || '[]'); } catch { return []; }
  });

  const savedChat = chats.find((c) => c.type === 'saved');
  const quickReactions = user?.quickReactions?.length ? user.quickReactions : DEFAULT_QUICK_REACTIONS;

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

  const handleAddAnotherAccount = () => {
    if (confirm("Add another account? You'll be logged out of this one first, then can sign in or register with a different account.")) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="page-panel">
      <div className="page-panel__topbar">
        <h1>Settings</h1>
      </div>

      <div className="settings-scroll">
        <div className="settings-section">
          <div className="settings-section__title">Appearance</div>
          <Row
            icon={theme === 'dark' ? '🌙' : '☀️'}
            label="Dark Mode"
            sub={theme === 'dark' ? 'On' : 'Off'}
            right={<Switch checked={theme === 'dark'} onChange={toggleTheme} />}
          />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Account</div>
          <EditableRow icon="👤" label="Profile Name" value={user?.name} placeholder="Add your name" onSave={(v) => v && updateProfile({ name: v })} />
          <EditableRow icon="ℹ️" label="Bio" value={user?.bio} placeholder="Add a bio" onSave={(v) => updateProfile({ bio: v })} />
          <EditableRow icon="🎂" label="Birthday" value={user?.birthday} placeholder="Add Birthday" type="date" onSave={(v) => updateProfile({ birthday: v })} />
          <Row icon="➕" label="Add Another Account" onClick={handleAddAnotherAccount} />
          <Row icon="🚪" label="Log Out" onClick={logout} danger />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Chat Settings</div>
          <div className="settings-row" style={{ display: 'block' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span className="settings-row__icon">🖼️</span>
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
          <Row icon="🔖" label="Saved Messages" sub="Send notes and files to yourself" onClick={() => savedChat && onOpenSaved(savedChat.id)} />
          <Row icon="🔔" label="Notifications" sub="Always on (this version)" />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Stickers &amp; Emoji</div>
          <Row
            icon="🧩"
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
          <Row icon="👑" label="FairyChat" sub="v1.0 — your own private messaging platform" />
        </div>
      </div>
    </div>
  );
}
