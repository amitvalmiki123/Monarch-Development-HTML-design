import { useAuth } from '../../context/AuthContext';
import { REACTION_CHOICES, DEFAULT_QUICK_REACTIONS } from '../../data/emojiData';
import { SettingsSubPage } from './shared';

export default function MessageReactionsPage({ onBack }) {
  const { user, updateProfile } = useAuth();
  const quickReactions = user?.quickReactions?.length ? user.quickReactions : DEFAULT_QUICK_REACTIONS;

  const toggleReaction = (emoji) => {
    const has = quickReactions.includes(emoji);
    let next;
    if (has) {
      next = quickReactions.filter((e) => e !== emoji);
    } else {
      if (quickReactions.length >= 8) return;
      next = [...quickReactions, emoji];
    }
    updateProfile({ quickReactions: next });
  };

  return (
    <SettingsSubPage title="Message Reactions" onBack={onBack}>
      <div className="settings-section">
        <div style={{ padding: '2px 16px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
          Pick up to 8 emoji for your quick-react bar (long-press a message to use it).
        </div>
        <div className="reaction-manage-grid">
          {REACTION_CHOICES.map((e) => (
            <button
              key={e}
              className={`reaction-manage-btn${quickReactions.includes(e) ? ' active' : ''}`}
              onClick={() => toggleReaction(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
    </SettingsSubPage>
  );
}
