import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

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
          {item(onNewDirect, '💬', 'Nayi Chat')}
          {item(onNewGroup, '👥', 'Naya Group')}
          {item(onNewChannel, '📢', 'Naya Channel')}
          <div className="top-menu__divider" />
          {item(toggleTheme, theme === 'dark' ? '☀️' : '🌙', theme === 'dark' ? 'Light Mode' : 'Dark Mode')}
        </div>
      )}
    </div>
  );
}
