import { ChatsIcon, ContactsIcon, SettingsIcon, ProfileIcon } from './NavIcons';

const TABS = [
  { id: 'chats', label: 'Chats', Icon: ChatsIcon },
  { id: 'contacts', label: 'Contacts', Icon: ContactsIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  { id: 'profile', label: 'Profile', Icon: ProfileIcon }
];

export default function BottomNav({ active, onChange, unreadTotal }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          className={`bottom-nav__item${active === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
        >
          <span className="bottom-nav__icon">
            <Icon active={active === id} />
            {id === 'chats' && unreadTotal > 0 && (
              <span className="bottom-nav__badge">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
            )}
          </span>
          <span className="bottom-nav__label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
