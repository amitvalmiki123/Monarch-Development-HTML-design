import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const WALLPAPERS = [
  { id: 'default', label: 'Default' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'rose', label: 'Rose' },
  { id: 'plain-dark', label: 'Plain Dark' }
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('monarch_theme') || 'dark');
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('monarch_wallpaper') || 'default');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('monarch_theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-wallpaper', wallpaper);
    localStorage.setItem('monarch_wallpaper', wallpaper);
  }, [wallpaper]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, wallpaper, setWallpaper }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
