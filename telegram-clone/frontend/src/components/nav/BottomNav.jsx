const TABS = [
  { id: 'chats', label: 'Chats', icon: '💬' },
  { id: 'contacts', label: 'Contacts', icon: '👥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'profile', label: 'Profile', icon: '🙍' }
];

export default function BottomNav({ active, onChange, unreadTotal }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav__item${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav__icon">
            {tab.icon}
            {tab.id === 'chats' && unreadTotal > 0 && (
              <span className="bottom-nav__badge">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
            )}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
