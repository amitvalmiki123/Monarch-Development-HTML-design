import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { ChatBubbleGlyphIcon, UsersGlyphIcon, MegaphoneGlyphIcon, MoonIcon, SunIcon } from '../common/SettingsIcons';

export default function TopMenu({ onNewDirect, onNewGroup, onNewChannel }) {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const item = (fn, icon, label) => (
    <button className="top-menu__item" onClick={() => { setOpen(false); fn(); }}>
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen((v) => !v)} title="Menu">⋮</button>
      {open && (
        <div className="top-menu">
          {item(onNewDirect, <ChatBubbleGlyphIcon />, 'New Chat')}
          {item(onNewGroup, <UsersGlyphIcon />, 'New Group')}
          {item(onNewChannel, <MegaphoneGlyphIcon />, 'New Channel')}
          <div className="top-menu__divider" />
          {item(toggleTheme, theme === 'dark' ? <SunIcon /> : <MoonIcon />, theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
        </div>
      )}
    </div>
  );
}
