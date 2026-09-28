import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PuzzleIcon, SmileGlyphIcon, ReactionIcon, SparkleLockIcon } from '../../components/common/SettingsIcons';
import { PREMIUM_EMOJIS } from '../../data/premiumEmojiData';
import { Row, SettingsSubPage } from './shared';
import EmojiCategoriesPage from './EmojiCategoriesPage';
import AnimatedEmojisPage from './AnimatedEmojisPage';
import MessageReactionsPage from './MessageReactionsPage';

export default function StickersEmojiPage({ onBack }) {
  const { user } = useAuth();
  const isPremium = !!user?.isPremium;
  const [subView, setSubView] = useState('main'); // main | emojis | animated | reactions

  if (subView === 'emojis') return <EmojiCategoriesPage onBack={() => setSubView('main')} />;
  if (subView === 'animated') return <AnimatedEmojisPage onBack={() => setSubView('main')} />;
  if (subView === 'reactions') return <MessageReactionsPage onBack={() => setSubView('main')} />;

  return (
    <SettingsSubPage title="Stickers & Emojis" onBack={onBack}>
      <div className="settings-section">
        <Row
          icon={<PuzzleIcon />}
          iconColor="purple"
          label="Stickers"
          sub="Real, animated Telegram-style stickers — search or browse trending in the Stickers tab"
        />
        <Row
          icon={<SmileGlyphIcon />}
          iconColor="gray"
          label="Emojis"
          sub="Show or hide categories in the Emoji tab"
          onClick={() => setSubView('emojis')}
          right={<span className="settings-row__chevron">›</span>}
        />
        <Row
          icon={<SparkleLockIcon />}
          iconColor="gold"
          label="Animated Emojis"
          sub={isPremium ? `${PREMIUM_EMOJIS.length} emoji, browsable by category` : 'FairyChat Premium perk — tap to preview'}
          onClick={() => setSubView('animated')}
          right={<span className="settings-row__chevron">{isPremium ? '›' : '🔒'}</span>}
        />
        <Row
          icon={<ReactionIcon />}
          iconColor="pink"
          label="Message Reactions"
          sub="Choose your quick-react emoji bar"
          onClick={() => setSubView('reactions')}
          right={<span className="settings-row__chevron">›</span>}
        />
      </div>
    </SettingsSubPage>
  );
}
