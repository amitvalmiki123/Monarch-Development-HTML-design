import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PREMIUM_EMOJI_CATEGORIES, PREMIUM_EMOJIS } from '../../data/premiumEmojiData';
import PremiumLottieEmoji from '../../components/common/PremiumLottieEmoji';
import { SettingsSubPage } from './shared';

// FairyChat Premium's "Animated Emojis" perk — 720 real animated emoji
// (Google's Animated Noto Emoji, CC BY 4.0) browsable by category, shown
// with live looping previews like Telegram's own sticker/emoji pack browser.
// Free users see the same category/grid UI but locked behind a blurred
// overlay + upgrade prompt, so it still sells the feature rather than just
// hiding it.
export default function AnimatedEmojisPage({ onBack }) {
  const { user } = useAuth();
  const isPremium = !!user?.isPremium;
  const [activeCategory, setActiveCategory] = useState(PREMIUM_EMOJI_CATEGORIES[0].id);

  const emojisInCategory = useMemo(
    () => PREMIUM_EMOJIS.filter((e) => e.category === activeCategory),
    [activeCategory]
  );

  return (
    <SettingsSubPage title="Animated Emojis" onBack={onBack}>
      <div className="settings-section" style={{ marginBottom: 6 }}>
        <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
          {PREMIUM_EMOJIS.length} real animated emoji across {PREMIUM_EMOJI_CATEGORIES.length} categories.
          {!isPremium && ' A FairyChat Premium perk — preview below, unlock to use them.'}
        </div>
      </div>

      <div className="animated-emoji-cat-tabs">
        {PREMIUM_EMOJI_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`animated-emoji-cat-tab${activeCategory === cat.id ? ' active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span style={{ marginRight: 5 }}>{cat.icon}</span>{cat.label}
          </button>
        ))}
      </div>

      <div className="animated-emoji-grid-wrap">
        <div className={`animated-emoji-grid${isPremium ? '' : ' animated-emoji-grid--locked'}`}>
          {emojisInCategory.map((e) => (
            <div key={e.id} className="animated-emoji-cell" title={e.label}>
              <PremiumLottieEmoji id={e.id} size={44} />
              <span className="animated-emoji-cell__label">{e.label}</span>
            </div>
          ))}
        </div>

        {!isPremium && (
          <div className="animated-emoji-lock-overlay">
            <div className="animated-emoji-lock-overlay__icon">🔒</div>
            <div className="animated-emoji-lock-overlay__title">FairyChat Premium</div>
            <div className="animated-emoji-lock-overlay__sub">
              Unlock all {PREMIUM_EMOJIS.length} animated emoji packs
            </div>
          </div>
        )}
      </div>
    </SettingsSubPage>
  );
}
