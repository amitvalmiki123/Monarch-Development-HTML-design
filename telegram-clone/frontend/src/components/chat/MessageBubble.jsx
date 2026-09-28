import { useState } from 'react';
import { formatMessageTime, formatFileSize } from '../../utils/format';
import { resolveMediaUrl } from '../../utils/resolveUrl';
import { useMessageGestures } from '../../hooks/useMessageGestures';
import { isEmojiOnlyMessage, splitEmojiSegments } from '../../utils/emojiMessage';
import { lottieIdForEmoji } from '../../data/lottieEmojiMap';
import NameWithFlair from '../common/NameWithFlair';
import LottieEmoji from '../common/LottieEmoji';
import PremiumLottieEmoji from '../common/PremiumLottieEmoji';

// Any interactive element nested inside a bubble (media, reaction pills, the
// edit textarea/buttons) needs to stop the tap/long-press/swipe recognizer
// from ever arming in the first place — stopping propagation on `onClick`
// alone is NOT enough, because the gesture recognizer listens for the raw
// onMouseDown/onTouchStart events, which fire (and start their own timers)
// well before any `click` event exists. Spread this onto anything that
// should behave like a normal, independent control.
const stopGesture = {
  onMouseDown: (e) => e.stopPropagation(),
  onTouchStart: (e) => e.stopPropagation()
};

// Renders normal message text, but with any individual emoji inside it
// (not just emoji-only messages) given a real Lottie animation — for the
// common emoji that have one bundled (see data/lottieEmojiMap.js) — or a
// small looping CSS wiggle as a fallback for the rest, for Premium
// senders. This is the "Animated Emojis in any message" perk in action:
// "hey 👋 congrats 🎉 on the launch!" gets two little animated emoji
// sitting right in the middle of otherwise-plain text.
function TextWithInlineEmoji({ text, animated }) {
  if (!animated) return <>{text}</>;
  const segments = splitEmojiSegments(text);
  return (
    <>
      {segments.map((seg, i) => {
        if (!seg.emoji) return <span key={i}>{seg.text}</span>;
        const lottieId = lottieIdForEmoji(seg.text);
        return lottieId
          ? <LottieEmoji key={i} id={lottieId} size={20} className="inline-emoji" />
          : <span key={i} className="inline-emoji inline-emoji--animated">{seg.text}</span>;
      })}
    </>
  );
}

// Same idea, but sized up for an emoji-only message (no bubble background,
// jumbo-sized, same as Telegram) — each emoji renders as a real animation
// when we have one bundled, falling back to the CSS pop+wiggle otherwise.
function JumboEmojiContent({ text, animated }) {
  if (!animated) return <span className="jumbo-emoji">{text}</span>;
  const segments = splitEmojiSegments(text).filter((s) => s.emoji);
  return (
    <span className="jumbo-emoji jumbo-emoji--row">
      {segments.map((seg, i) => {
        const lottieId = lottieIdForEmoji(seg.text);
        return lottieId
          ? <LottieEmoji key={i} id={lottieId} size={48} />
          : <span key={i} className="jumbo-emoji--animated">{seg.text}</span>;
      })}
    </span>
  );
}

function Ticks({ read, pending, failed }) {
  if (failed) return <span title="Failed to send" style={{ color: 'var(--danger)' }}>⚠</span>;
  if (pending) return <span title="Sending...">🕓</span>;
  return <span className={`ticks${read ? ' read' : ''}`} title={read ? 'Read' : 'Sent'}>{read ? '✓✓' : '✓'}</span>;
}

function FilePreview({ message }) {
  const fileUrl = resolveMediaUrl(message.fileUrl);
  if (message.type === 'image') {
    return <img className="msg-image" src={fileUrl} alt={message.fileName || 'photo'} {...stopGesture} onClick={(e) => { e.stopPropagation(); window.open(fileUrl, '_blank'); }} />;
  }
  if (message.type === 'gif') {
    return <img className="msg-image" src={fileUrl} alt={message.fileName || 'GIF'} loading="lazy" {...stopGesture} onClick={(e) => e.stopPropagation()} />;
  }
  if (message.type === 'video') {
    return <video src={fileUrl} controls style={{ maxWidth: '100%', width: 280, borderRadius: 12, marginBottom: 4 }} {...stopGesture} onClick={(e) => e.stopPropagation()} />;
  }
  if (message.type === 'audio') {
    return <audio src={fileUrl} controls style={{ marginBottom: 4 }} {...stopGesture} onClick={(e) => e.stopPropagation()} />;
  }
  return (
    <a href={fileUrl} target="_blank" rel="noreferrer" className="file-chip" {...stopGesture} onClick={(e) => e.stopPropagation()}>
      <span className="file-icon">📎</span>
      <span>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{message.fileName || 'File'}</div>
        <div style={{ fontSize: 11.5, opacity: 0.75 }}>{formatFileSize(message.fileSize)}</div>
      </span>
    </a>
  );
}

function ReactionPills({ reactions, currentUserId, onToggle }) {
  const entries = Object.entries(reactions || {}).filter(([, users]) => users?.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="reaction-pills" {...stopGesture}>
      {entries.map(([emoji, users]) => (
        <button
          key={emoji}
          className={`reaction-pill${users.includes(currentUserId) ? ' mine' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(emoji); }}
        >
          {emoji} <span>{users.length}</span>
        </button>
      ))}
    </div>
  );
}

export default function MessageBubble({
  message, isOwn, senderName, senderInfo, showSenderName, replyPreview,
  currentUserId, onReact,
  isEditing, editDraft, onEditDraftChange, onSubmitEdit, onCancelEdit,
  isPinned,
  selectionMode, selected, onToggleSelect,
  onOpenActions, onLongPress, onSwipeReply
}) {
  const [localDraft, setLocalDraft] = useState(message.content || '');
  const draft = editDraft ?? localDraft;
  const setDraft = onEditDraftChange || setLocalDraft;

  const { swipeX, handlers } = useMessageGestures({
    // Fully disable the tap/long-press/swipe recognizer while this bubble
    // is in its inline edit box — otherwise a tap meant to place the text
    // cursor (or hit Save/Cancel) could instead be swallowed as "open the
    // action sheet on this message" before it ever reaches the textarea.
    disabled: message.deleted || isEditing,
    onTap: () => {
      if (selectionMode) onToggleSelect?.(message.id);
      else onOpenActions?.(message);
    },
    onDoubleTap: () => onReact?.(message.id, '❤️'),
    onLongPress: () => onLongPress?.(message),
    onSwipeReply: () => onSwipeReply?.(message)
  });

  const toggleReaction = (emoji) => onReact?.(message.id, emoji);

  const submitEdit = () => {
    if (draft.trim() && draft !== message.content) onSubmitEdit(message.id, draft.trim());
    else onCancelEdit();
  };

  if (message.deleted) {
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}`}>
        <div className={`bubble ${isOwn ? 'out' : 'in'} deleted`}>This message was deleted</div>
      </div>
    );
  }

  const swipeStyle = swipeX > 0 ? { transform: `translateX(${swipeX}px)` } : undefined;
  const replyHintStyle = { opacity: Math.min(1, swipeX / 40) };

  // Stickers render with no bubble background, same as Telegram: a real
  // animated sticker image (fileUrl, from the Stickers tab) when present,
  // falling back to a big emoji for any older sticker messages that only
  // ever stored a plain emoji character.
  if (message.type === 'sticker') {
    const stickerImg = message.fileUrl ? resolveMediaUrl(message.fileUrl) : null;
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}${selected ? ' row-selected' : ''}`}>
        {selectionMode && <span className={`msg-select-check${selected ? ' checked' : ''}`}>{selected ? '✓' : ''}</span>}
        <span className="swipe-reply-hint" style={replyHintStyle}>↩</span>
        <div className="sticker-bubble" style={swipeStyle} {...handlers}>
          {stickerImg ? (
            // FairyChat's own premium stickers are real per-frame animated
            // WEBP files (see telegram-clone/tools/animate_sticker.py) — they animate on
            // their own the moment the <img> loads, same as any other
            // animated sticker app; no extra CSS needed here.
            <img className="sticker-bubble__img" src={stickerImg} alt={message.fileName || 'Sticker'} loading="lazy" />
          ) : (
            <div className="sticker-bubble__emoji">{message.content}</div>
          )}
          <div className="sticker-bubble__meta">
            {formatMessageTime(message.createdAt)}
            {isOwn && <Ticks read={message.read} pending={message.pending} failed={message.failed} />}
          </div>
          <ReactionPills reactions={message.reactions} currentUserId={currentUserId} onToggle={toggleReaction} />
        </div>
      </div>
    );
  }

  // FairyChat Premium's "Animated Emojis" — sent from the Emoji tab's
  // Premium categories. Rendered jumbo, no bubble background, same treatment
  // as a sticker, but using the real looping Lottie animation instead of an
  // image file (content holds the pack's emoji id, e.g. "fire").
  if (message.type === 'animated-emoji') {
    return (
      <div className={`bubble-row ${isOwn ? 'out' : 'in'}${selected ? ' row-selected' : ''}`}>
        {selectionMode && <span className={`msg-select-check${selected ? ' checked' : ''}`}>{selected ? '✓' : ''}</span>}
        <span className="swipe-reply-hint" style={replyHintStyle}>↩</span>
        <div className="sticker-bubble" style={swipeStyle} {...handlers}>
          <PremiumLottieEmoji id={message.content} size={100} />
          <div className="sticker-bubble__meta">
            {formatMessageTime(message.createdAt)}
            {isOwn && <Ticks read={message.read} pending={message.pending} failed={message.failed} />}
          </div>
          <ReactionPills reactions={message.reactions} currentUserId={currentUserId} onToggle={toggleReaction} />
        </div>
      </div>
    );
  }

  return (
    <div className={`bubble-row ${isOwn ? 'out' : 'in'}${selected ? ' row-selected' : ''}`}>
      {selectionMode && <span className={`msg-select-check${selected ? ' checked' : ''}`}>{selected ? '✓' : ''}</span>}
      <span className="swipe-reply-hint" style={replyHintStyle}>↩</span>
      <div className={`bubble ${isOwn ? 'out' : 'in'}`} style={{ opacity: message.pending ? 0.7 : 1, ...swipeStyle }} {...handlers}>
        {!isOwn && showSenderName && (
          <NameWithFlair name={senderName} user={senderInfo} className="sender-name" badgeSize={12} />
        )}

        {isPinned && <div className="pinned-tag">📌 Pinned</div>}

        {replyPreview && (
          <div className="reply-quote">
            <div className="reply-quote__name">{replyPreview.senderName}</div>
            <div className="reply-quote__text">{replyPreview.text}</div>
          </div>
        )}

        {message.fileUrl && <FilePreview message={message} />}

        {isEditing ? (
          <div {...stopGesture} onClick={(e) => e.stopPropagation()}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ width: '100%', minWidth: 200, background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: 8, color: '#fff', padding: 6, fontSize: 14 }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') onCancelEdit(); }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button {...stopGesture} onClick={(e) => { e.stopPropagation(); submitEdit(); }} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--gold-light)' }}>Save</button>
              <button {...stopGesture} onClick={(e) => { e.stopPropagation(); onCancelEdit(); }} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--text-secondary)' }}>Cancel</button>
            </div>
          </div>
        ) : (
          message.content && (
            isEmojiOnlyMessage(message.content) ? (
              <JumboEmojiContent text={message.content} animated={!!senderInfo?.isPremium} />
            ) : (
              <span><TextWithInlineEmoji text={message.content} animated={!!senderInfo?.isPremium} /></span>
            )
          )
        )}

        <div className="meta">
          {message.editedAt && <span>edited</span>}
          <span>{formatMessageTime(message.createdAt)}</span>
          {isOwn && <Ticks read={message.read} pending={message.pending} failed={message.failed} />}
        </div>

        <ReactionPills reactions={message.reactions} currentUserId={currentUserId} onToggle={toggleReaction} />
      </div>
    </div>
  );
}
