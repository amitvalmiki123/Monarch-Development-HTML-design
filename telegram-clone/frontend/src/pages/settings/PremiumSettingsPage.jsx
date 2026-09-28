import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import http from '../../api/http';
import { PaletteIcon, StarIcon, PhoneAppIcon, SparkleLockIcon } from '../../components/common/SettingsIcons';
import LottieEmoji from '../../components/common/LottieEmoji';
import { Row, SettingsSubPage } from './shared';
import { NameColorPage, EmojiStatusPage, AppIconPage, ProfileBadgePage } from './PremiumSubPages';
import AnimatedEmojisPage from './AnimatedEmojisPage';

const PREMIUM_PERKS = [
  '⭐ Profile badge', '✨ Animated emoji messages', '😎 Emoji status',
  '🎨 Name & profile colour', '📱 Premium app icons', '🖼️ Animated avatar',
  '🧩 Premium stickers', '💬 Infinite reactions', '🎞️ 720+ Animated Emojis'
];

export default function PremiumSettingsPage({ onBack }) {
  const { user } = useAuth();
  const [subView, setSubView] = useState('main');
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (subView === 'name-color') return <NameColorPage onBack={() => setSubView('main')} />;
  if (subView === 'emoji-status') return <EmojiStatusPage onBack={() => setSubView('main')} />;
  if (subView === 'app-icon') return <AppIconPage onBack={() => setSubView('main')} />;
  if (subView === 'badges') return <ProfileBadgePage onBack={() => setSubView('main')} />;
  if (subView === 'animated-emojis') return <AnimatedEmojisPage onBack={() => setSubView('main')} />;

  const redeem = async () => {
    if (!code.trim()) return;
    setError(''); setSuccess(''); setRedeeming(true);
    try {
      const res = await http.post('/users/me/premium/redeem', { code: code.trim() });
      setSuccess('🎉 FairyChat Premium activated!');
      setCode('');
      if (res.data?.user) {
        localStorage.setItem('monarch_user', JSON.stringify(res.data.user));
        window.location.reload();
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Could not redeem that code');
    } finally {
      setRedeeming(false);
    }
  };

  if (!user?.isPremium) {
    return (
      <SettingsSubPage title="FairyChat Premium" onBack={onBack}>
        <div className="settings-section">
          <div className="premium-upsell-box">
            <div className="premium-upsell-box__title">
              <LottieEmoji id="glowing-star" size={22} /> FairyChat Premium
            </div>
            <div className="premium-upsell-box__sub">Unlock a profile badge, name colours, an emoji status, premium app icons, animated avatars, exclusive stickers, 720+ animated emoji and infinite reactions.</div>
            <div className="premium-feature-grid">
              {PREMIUM_PERKS.map((p) => <div key={p} className="premium-feature-chip">{p}</div>)}
            </div>
            {error && <div style={{ color: 'var(--danger)', fontSize: 12.5, marginBottom: 8 }}>{error}</div>}
            {success && <div style={{ color: 'var(--gold-light)', fontSize: 12.5, marginBottom: 8 }}>{success}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="profile-inline-input"
                style={{ flex: 1, border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 10px' }}
                placeholder="FAIRY-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button className="btn-primary btn-gold" disabled={redeeming || !code.trim()} onClick={redeem}>
                {redeeming ? '...' : 'Redeem'}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>
              No payment gateway yet — ask the app owner for a redeem code.
            </div>
          </div>

          <Row icon={<SparkleLockIcon />} iconColor="gold" label="Animated Emojis" sub="Preview the 720-emoji pack" onClick={() => setSubView('animated-emojis')} right={<span className="settings-row__chevron">🔒</span>} />
        </div>
      </SettingsSubPage>
    );
  }

  return (
    <SettingsSubPage title="FairyChat Premium" onBack={onBack}>
      <div className="settings-section">
        <div className="premium-status-card">
          <span className="premium-status-card__icon"><LottieEmoji id="glowing-star" size={30} /></span>
          <div>
            <div className="premium-status-card__title">FairyChat Premium — active</div>
            <div className="premium-status-card__sub">Thanks for supporting FairyChat!</div>
          </div>
        </div>

        <Row icon={<PaletteIcon />} iconColor="pink" label="Name Colour" sub={user.nameColor ? 'Custom colour set' : 'Default'} onClick={() => setSubView('name-color')} right={<span className="settings-row__chevron">›</span>} />
        <Row icon={<StarIcon />} iconColor="gold" label="Emoji Status" sub="An animated emoji next to your name" onClick={() => setSubView('emoji-status')} right={<span className="settings-row__chevron">›</span>} />
        <Row icon={<PhoneAppIcon />} iconColor="blue" label="App Icon" sub="Only visible on the installed Android app" onClick={() => setSubView('app-icon')} right={<span className="settings-row__chevron">›</span>} />
        <Row icon={<StarIcon />} iconColor="pink" label="Profile Badges" sub="Shown next to your name everywhere" onClick={() => setSubView('badges')} right={<span className="settings-row__chevron">›</span>} />
        <Row icon={<SparkleLockIcon />} iconColor="gold" label="Animated Emojis" sub="720+ emoji, browsable by category" onClick={() => setSubView('animated-emojis')} right={<span className="settings-row__chevron">›</span>} />

        <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Animated avatars: upload a GIF from your Profile photo picker — it'll play automatically. ✨ Animated emoji messages
          happen automatically when you send 1-3 emoji alone. 💬 Infinite Reactions: long-press any message and tap the ➕
          to react with any emoji, and stack more than one.
        </div>
      </div>
    </SettingsSubPage>
  );
}
