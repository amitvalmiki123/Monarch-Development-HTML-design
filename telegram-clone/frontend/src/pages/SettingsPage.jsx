import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';

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

export default function SettingsPage({ onOpenSaved }) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { chats } = useChat();

  const savedChat = chats.find((c) => c.type === 'saved');

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
          <div className="settings-section__title">Chats</div>
          <Row icon="🔖" label="Saved Messages" sub="Apne notes, files khud ko bhejein" onClick={() => savedChat && onOpenSaved(savedChat.id)} />
          <Row icon="🔔" label="Notifications" sub="Hamesha on (is version me)" />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">Account</div>
          <Row icon="👤" label={user?.name} sub={`@${user?.username}`} />
          <Row icon="🚪" label="Logout" onClick={logout} danger />
        </div>

        <div className="settings-section">
          <div className="settings-section__title">About</div>
          <Row icon="👑" label="Monarch Chat" sub="v1.0 — apna khud ka messaging platform" />
        </div>
      </div>
    </div>
  );
}
