import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/common/Avatar';
import NameWithFlair from '../../components/common/NameWithFlair';
import { CameraGlyphIcon, PencilGlyphIcon } from '../../components/common/SettingsIcons';
import { SettingsIcon } from '../../components/nav/NavIcons';
import { SettingsSubPage } from './shared';
import {
  PROFILE_BG_GRADIENTS, PROFILE_BG_SOLIDS, PROFILE_BG_ICONS,
  profileBgCss, profileBgPatternImage
} from '../../data/profileBackgrounds';

// "Change Profile Colour" — opened from the Profile screen's 3-dot menu.
// A dedicated page (not an inline expander) with a live mini-preview of the
// hero block, then Telegram-style gradient / solid colour swatches and a
// scattered icon-pattern layer beneath them. A FairyChat Premium perk —
// free accounts see everything but can't apply.
export default function ProfileColorPage({ onBack }) {
  const { user, updateProfile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const bg = profileBgCss(user.profileBgStyle);
  const pattern = profileBgPatternImage(user.profileBgIcon);

  const apply = async (patch) => {
    if (!user.isPremium) {
      setError('Profile colour is a FairyChat Premium feature — activate Premium from Settings → FairyChat Premium.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await updateProfile(patch);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSubPage title="Profile Colour" onBack={onBack}>
      <div className="settings-section">
        {!user.isPremium && (
          <div className="premium-hint">
            ⭐ Profile Colour is a FairyChat Premium perk — pick any gradient or solid
            colour (plus an icon pattern) for the background of your profile's photo,
            name and buttons area. Activate Premium from Settings → FairyChat Premium to use it.
          </div>
        )}
        {error && <div className="profile-color-error">{error}</div>}

        {/* Live preview of the profile hero block with the current picks */}
        <div className="profile-color-preview" style={{ background: bg || 'linear-gradient(160deg, var(--bubble-out-from), var(--bg-panel) 75%)' }}>
          {pattern && <div className="profile-color-preview__pattern" style={{ backgroundImage: pattern }} />}
          <div className="profile-color-preview__avatar">
            <Avatar name={user.name} color={user.avatarColor} photoUrl={user.avatarUrl} size={64} />
          </div>
          <div className="profile-color-preview__name"><NameWithFlair name={user.name} user={user} badgeSize={12} /></div>
          <div className="profile-color-preview__buttons">
            <span><CameraGlyphIcon /> Set Photo</span>
            <span><PencilGlyphIcon /> Edit Info</span>
            <span><SettingsIcon active /> Settings</span>
          </div>
        </div>

        <div className="settings-section__title">Gradient</div>
        <div className="color-swatch-grid">
          <button
            className={`color-swatch color-swatch--wide${!user.profileBgStyle ? ' active' : ''}`}
            onClick={() => apply({ profileBgStyle: null, profileBgIcon: user.profileBgIcon || 'none' })}
            disabled={busy}
            title="Default"
          >
            <span className="color-swatch__none">╱╱</span>
          </button>
          {PROFILE_BG_GRADIENTS.map((g) => (
            <button
              key={g.id}
              className={`color-swatch color-swatch--wide${user.profileBgStyle === g.id ? ' active' : ''}`}
              style={{ background: g.css, opacity: busy ? 0.6 : 1 }}
              onClick={() => apply({ profileBgStyle: g.id })}
              disabled={busy}
            />
          ))}
        </div>

        <div className="settings-section__title">Solid</div>
        <div className="color-swatch-grid">
          {PROFILE_BG_SOLIDS.map((s) => (
            <button
              key={s.id}
              className={`color-swatch color-swatch--wide${user.profileBgStyle === s.id ? ' active' : ''}`}
              style={{ background: s.css, opacity: busy ? 0.6 : 1 }}
              onClick={() => apply({ profileBgStyle: s.id })}
              disabled={busy}
            />
          ))}
        </div>

        <div className="settings-section__title">Icons</div>
        <div style={{ padding: '2px 16px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
          An icon layer scattered over the background colour.
        </div>
        <div className="color-swatch-grid">
          {PROFILE_BG_ICONS.map((i) => (
            <button
              key={i.id}
              className={`profile-icon-swatch${(user.profileBgIcon || 'none') === i.id ? ' active' : ''}`}
              onClick={() => apply({ profileBgIcon: i.id })}
              disabled={busy}
              title={i.label}
            >
              {i.glyph || <span className="color-swatch__none">╱╱</span>}
              <span className="profile-icon-swatch__label">{i.label}</span>
            </button>
          ))}
        </div>
      </div>
    </SettingsSubPage>
  );
}
