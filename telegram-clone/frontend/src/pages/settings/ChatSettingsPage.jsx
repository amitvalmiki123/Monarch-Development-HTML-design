import { useTheme, WALLPAPERS } from '../../context/ThemeContext';
import { MoonIcon, SunIcon, BookmarkIcon, ImageIcon } from '../../components/common/SettingsIcons';
import { Row, Switch, SettingsSubPage, NotificationSettings } from './shared';

export default function ChatSettingsPage({ onBack, savedChat, onOpenSaved }) {
  const { theme, toggleTheme, wallpaper, setWallpaper } = useTheme();

  return (
    <SettingsSubPage title="Chat Settings" onBack={onBack}>
      <div className="settings-section">
        <div className="settings-row" style={{ display: 'block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <span className="settings-row__icon--badge icon-badge--orange"><ImageIcon /></span>
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
          icon={theme === 'dark' ? <MoonIcon /> : <SunIcon />}
          iconColor="orange"
          label="Night Mode"
          sub={theme === 'dark' ? 'On' : 'Off'}
          right={<Switch checked={theme === 'dark'} onChange={toggleTheme} />}
        />
        <Row icon={<BookmarkIcon />} iconColor="blue" label="Saved Messages" sub="Send notes and files to yourself" onClick={() => savedChat && onOpenSaved(savedChat.id)} />
        <NotificationSettings />
      </div>
    </SettingsSubPage>
  );
}
