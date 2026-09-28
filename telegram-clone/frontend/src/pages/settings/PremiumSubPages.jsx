import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import LottieEmoji from '../../components/common/LottieEmoji';
import PremiumBadge from '../../components/common/PremiumBadge';
import { NAME_COLORS, STATUS_EMOJIS, APP_ICONS, BADGE_STYLES } from '../../data/premiumData';
import { applyNativeAppIcon } from '../../utils/appIcon';
import { SettingsSubPage } from './shared';

export function NameColorPage({ onBack }) {
  const { user, updateProfile } = useAuth();
  const [busy, setBusy] = useState(null);

  const setNameColor = async (color) => {
    setBusy(color);
    try { await updateProfile({ nameColor: color }); } finally { setBusy(null); }
  };

  return (
    <SettingsSubPage title="Name Colour" onBack={onBack}>
      <div className="settings-section">
        <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
          Pick a colour for your name — shown in chats, groups and channels.
        </div>
        <div className="color-swatch-grid">
          <button
            className={`color-swatch${!user.nameColor ? ' active' : ''}`}
            style={{ background: 'var(--text-primary, #fff)', border: '1px solid var(--border-soft)' }}
            onClick={() => setNameColor(null)}
            title="Default"
          />
          {NAME_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch${user.nameColor === c ? ' active' : ''}`}
              style={{ background: c, opacity: busy === c ? 0.5 : 1 }}
              onClick={() => setNameColor(c)}
            />
          ))}
        </div>
      </div>
    </SettingsSubPage>
  );
}

export function EmojiStatusPage({ onBack }) {
  const { user, updateProfile } = useAuth();
  const [busy, setBusy] = useState(null);

  const setStatusEmoji = async (emoji) => {
    setBusy(emoji);
    try { await updateProfile({ statusEmoji: user.statusEmoji === emoji ? null : emoji }); } finally { setBusy(null); }
  };

  return (
    <SettingsSubPage title="Emoji Status" onBack={onBack}>
      <div className="settings-section">
        <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
          Shown next to your name instead of the online dot.
        </div>
        <div className="emoji-status-grid">
          {STATUS_EMOJIS.map((s) => (
            <button
              key={s.id}
              className={user.statusEmoji === s.id ? 'active' : ''}
              style={{ opacity: busy === s.id ? 0.5 : 1 }}
              onClick={() => setStatusEmoji(s.id)}
              title={s.label}
            >
              <LottieEmoji id={s.id} size={26} />
            </button>
          ))}
        </div>
      </div>
    </SettingsSubPage>
  );
}

export function AppIconPage({ onBack }) {
  const { user, updateProfile } = useAuth();
  const [busy, setBusy] = useState(null);

  const setAppIconChoice = async (iconId) => {
    setBusy(iconId);
    try {
      await updateProfile({ appIcon: iconId });
      await applyNativeAppIcon(iconId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SettingsSubPage title="App Icon" onBack={onBack}>
      <div className="settings-section">
        <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
          Only visible on the installed Android app.
        </div>
        <div className="app-icon-grid">
          {APP_ICONS.map((icon) => (
            <button
              key={icon.id}
              className={`app-icon-option${(user.appIcon || 'default') === icon.id ? ' active' : ''}`}
              onClick={() => setAppIconChoice(icon.id)}
              disabled={busy === icon.id}
            >
              <img src={icon.preview} alt={icon.label} />
              {icon.label}
            </button>
          ))}
        </div>
      </div>
    </SettingsSubPage>
  );
}

export function ProfileBadgePage({ onBack }) {
  const { user, updateProfile } = useAuth();
  const [busy, setBusy] = useState(null);

  const setBadgeStyle = async (badgeId) => {
    setBusy(badgeId);
    try { await updateProfile({ badgeStyle: badgeId }); } finally { setBusy(null); }
  };

  return (
    <SettingsSubPage title="Profile Badges" onBack={onBack}>
      <div className="settings-section">
        <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
          Shown next to your name everywhere.
        </div>
        <div className="app-icon-grid">
          {BADGE_STYLES.map((b) => {
            const isActive = (user.badgeStyle || 'star') === b.id;
            return (
              <button
                key={b.id}
                className={`app-icon-option badge-option${isActive ? ' active' : ''}`}
                onClick={() => setBadgeStyle(b.id)}
                disabled={busy === b.id}
              >
                <span className="badge-option__preview">
                  <PremiumBadge size={28} variant={b.id} style={{ marginLeft: 0 }} />
                  {isActive && <span className="badge-option__check">✓</span>}
                </span>
                <span className="badge-option__label">{b.label}{isActive ? ' · Active' : ''}</span>
              </button>
            );
          })}
        </div>
      </div>
    </SettingsSubPage>
  );
}
