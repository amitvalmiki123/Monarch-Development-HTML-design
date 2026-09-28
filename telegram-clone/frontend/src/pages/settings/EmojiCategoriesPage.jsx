import { useState } from 'react';
import { EMOJI_CATEGORIES } from '../../data/emojiData';
import { Row, Switch, SettingsSubPage } from './shared';

export default function EmojiCategoriesPage({ onBack }) {
  const [hiddenCategories, setHiddenCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('monarch_hidden_emoji_categories') || '[]'); } catch { return []; }
  });

  const toggleCategory = (catId) => {
    setHiddenCategories((prev) => {
      // Always keep at least one category visible in the emoji picker.
      if (!prev.includes(catId) && prev.length >= EMOJI_CATEGORIES.length - 1) return prev;
      const next = prev.includes(catId) ? prev.filter((p) => p !== catId) : [...prev, catId];
      localStorage.setItem('monarch_hidden_emoji_categories', JSON.stringify(next));
      return next;
    });
  };

  return (
    <SettingsSubPage title="Emojis" onBack={onBack}>
      <div className="settings-section">
        <div style={{ padding: '2px 16px 6px', fontSize: 12, color: 'var(--text-muted)' }}>
          Tap a category below to show or hide it in the Emoji tab.
        </div>
        {EMOJI_CATEGORIES.map((cat) => (
          <Row
            key={cat.id}
            icon={cat.icon}
            iconColor="gray"
            label={cat.label}
            onClick={() => toggleCategory(cat.id)}
            right={<Switch checked={!hiddenCategories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />}
          />
        ))}
      </div>
    </SettingsSubPage>
  );
}
