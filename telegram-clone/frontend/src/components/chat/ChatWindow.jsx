import { useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import MessageInput from './MessageInput';
import MessageActionSheet from './MessageActionSheet';
import ForwardModal from './ForwardModal';
import PinnedBanner from './PinnedBanner';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { pushBackHandler, popBackHandler } from '../../utils/backStack';

export default function ChatWindow({ chat, onBack }) {
  const { user } = useAuth();
  const {
    messagesByChat, hasMoreByChat, typingByChat, editMessage, deleteMessage, reactToMessage,
    loadMoreMessages, pinMessage, unpinMessage
  } = useChat();
  const messages = messagesByChat[chat.id] || [];
  const hasMore = hasMoreByChat[chat.id];
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const prevChatId = useRef(chat.id);

  // Which message's action sheet (Reply/Copy/Forward/Pin/Edit/Delete/Select
  // popup, opened by a tap) is currently open, if any.
  const [actionMessage, setActionMessage] = useState(null);
  // Multi-select mode (entered by holding a message down) — a Set of
  // selected message ids, plus the top/bottom bars that replace the normal
  // header/input while it's active.
  const [selectedIds, setSelectedIds] = useState(new Set());
  const selectMode = selectedIds.size > 0;
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [forwardIds, setForwardIds] = useState(null); // array of message ids, or null

  // Any number of messages can be pinned at once (Telegram-style). The
  // banner under the header shows one at a time and cycles through them —
  // `pinnedIndex` is which one is currently shown.
  const pinnedMessages = chat.pinnedMessages || [];
  const [pinnedIndex, setPinnedIndex] = useState(Math.max(0, pinnedMessages.length - 1));
  const pinnedCount = useRef(pinnedMessages.length);
  useEffect(() => {
    // Whenever a new message gets pinned (the list grows), jump the banner
    // to show that newest pin, same as Telegram.
    if (pinnedMessages.length > pinnedCount.current || pinnedIndex >= pinnedMessages.length) {
      setPinnedIndex(Math.max(0, pinnedMessages.length - 1));
    }
    pinnedCount.current = pinnedMessages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedMessages.length]);
  const currentPinned = pinnedMessages[pinnedIndex] || null;

  useEffect(() => {
    if (prevChatId.current !== chat.id) {
      prevChatId.current = chat.id;
      setReplyingTo(null);
      setSelectedIds(new Set());
      setActionMessage(null);
      setEditingId(null);
      setPinnedIndex(Math.max(0, (chat.pinnedMessages || []).length - 1));
    }
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [chat.id]);

  const lastMsgCount = useRef(0);
  useEffect(() => {
    if (messages.length > lastMsgCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    lastMsgCount.current = messages.length;
  }, [messages.length]);

  const memberById = useMemo(() => {
    const map = {};
    (chat.members || []).forEach((m) => { map[m.id] = m; });
    return map;
  }, [chat.members]);
  const memberNameById = useMemo(() => {
    const map = {};
    (chat.members || []).forEach((m) => { map[m.id] = m.name; });
    return map;
  }, [chat.members]);

  const messageById = useMemo(() => {
    const map = {};
    messages.forEach((m) => { map[m.id] = m; });
    return map;
  }, [messages]);

  const typingUserIds = typingByChat[chat.id] || [];
  const typingNames = typingUserIds.map((id) => memberNameById[id]).filter(Boolean);

  const handleLoadMore = async () => {
    if (!messages.length) return;
    setLoadingMore(true);
    const container = scrollRef.current;
    const prevHeight = container?.scrollHeight || 0;
    await loadMoreMessages(chat.id, messages[0].seq);
    requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - prevHeight;
    });
    setLoadingMore(false);
  };

  const handleDelete = (messageId) => {
    if (confirm('Delete this message?')) {
      deleteMessage(messageId).catch(() => alert('Could not delete message'));
    }
  };

  const handleReact = (messageId, emoji) => {
    reactToMessage(messageId, emoji).catch(() => {});
  };

  const toggleSelect = (messageId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId); else next.add(messageId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Back button while in message multi-select mode just exits select mode
  // (never the whole app, never the chat behind it).
  useEffect(() => {
    if (!selectMode) return undefined;
    pushBackHandler(clearSelection);
    return () => popBackHandler(clearSelection);
  }, [selectMode]);

  // Back button while editing a message cancels the edit first.
  useEffect(() => {
    if (!editingId) return undefined;
    const cancel = () => setEditingId(null);
    pushBackHandler(cancel);
    return () => popBackHandler(cancel);
  }, [editingId]);

  const selectedMessages = useMemo(() => Array.from(selectedIds).map((id) => messageById[id]).filter(Boolean), [selectedIds, messageById]);
  const allSelectedOwn = selectedMessages.length > 0 && selectedMessages.every((m) => m.senderId === user.id);

  const handleBulkDelete = () => {
    if (!confirm(`Delete ${selectedIds.size} message${selectedIds.size > 1 ? 's' : ''}?`)) return;
    Promise.all(Array.from(selectedIds).map((id) => deleteMessage(id).catch(() => {}))).finally(clearSelection);
  };

  const handleBulkCopy = () => {
    const text = selectedMessages.map((m) => m.content).filter(Boolean).join('\n');
    if (text) navigator.clipboard?.writeText(text).catch(() => {});
    clearSelection();
  };

  let lastDateKey = null;

  return (
    <div className="chat-panel">
      {selectMode ? (
        <div className="sidebar__topbar--selection">
          <button className="selection-bar__close" onClick={clearSelection} aria-label="Cancel selection">✕</button>
          <span className="selection-bar__count">{selectedIds.size} selected</span>
          <div className="selection-bar__actions">
            {selectedMessages.length === 1 && selectedMessages[0]?.type === 'text' && (
              <button className="selection-bar__action" onClick={handleBulkCopy} title="Copy">📋</button>
            )}
            <button className="selection-bar__action" onClick={() => setForwardIds(Array.from(selectedIds))} title="Forward">➡️</button>
            {allSelectedOwn && (
              <button className="selection-bar__action selection-bar__action--danger" onClick={handleBulkDelete} title="Delete">🗑️</button>
            )}
          </div>
        </div>
      ) : (
        <ChatHeader chat={chat} typingNames={typingNames} onBack={onBack} onShowInfo={() => {}} />
      )}

      {currentPinned && !selectMode && (
        <PinnedBanner
          message={currentPinned}
          index={pinnedIndex}
          count={pinnedMessages.length}
          onUnpin={() => unpinMessage(currentPinned.id).catch(() => {})}
          onJump={() => {
            const el = document.getElementById(`msg-${currentPinned.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Cycle to the next-older pinned message so tapping again walks
            // through all of them one at a time, same as Telegram.
            if (pinnedMessages.length > 1) {
              setPinnedIndex((i) => (i - 1 + pinnedMessages.length) % pinnedMessages.length);
            }
          }}
        />
      )}

      <div className="messages-scroll" ref={scrollRef}>
        {hasMore && (
          <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load earlier messages'}
          </button>
        )}

        {messages.map((m, idx) => {
          const dateKey = new Date(m.createdAt).toDateString();
          const showDate = dateKey !== lastDateKey;
          lastDateKey = dateKey;
          const isOwn = m.senderId === user.id;
          const prev = messages[idx - 1];
          const showSenderName = chat.type === 'group' && !isOwn && (!prev || prev.senderId !== m.senderId || showDate);
          const replyMsg = m.replyToId ? messageById[m.replyToId] : null;

          return (
            <div key={m.id} id={`msg-${m.id}`}>
              {showDate && <DateSeparator ts={m.createdAt} />}
              <MessageBubble
                message={m}
                isOwn={isOwn}
                senderName={memberNameById[m.senderId] || 'Member'}
                senderInfo={memberById[m.senderId]}
                showSenderName={showSenderName}
                currentUserId={user.id}
                onReact={handleReact}
                isPinned={pinnedMessages.some((pm) => pm.id === m.id)}
                isEditing={editingId === m.id}
                editDraft={editingId === m.id ? editDraft : undefined}
                onEditDraftChange={setEditDraft}
                onSubmitEdit={(id, content) => { editMessage(id, content).catch(() => alert('Could not edit message')); setEditingId(null); }}
                onCancelEdit={() => setEditingId(null)}
                selectionMode={selectMode}
                selected={selectedIds.has(m.id)}
                onToggleSelect={toggleSelect}
                onOpenActions={setActionMessage}
                onLongPress={(msg) => { setSelectedIds(new Set([msg.id])); }}
                onSwipeReply={setReplyingTo}
                replyPreview={replyMsg ? {
                  senderName: replyMsg.senderId === user.id ? 'You' : (memberNameById[replyMsg.senderId] || 'Member'),
                  text: replyMsg.deleted
                    ? 'Deleted message'
                    : (replyMsg.type === 'animated-emoji' ? '✨ Animated Emoji' : (replyMsg.content || 'Media message'))
                } : null}
              />
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="empty-state">
            <div className="glyph">👋</div>
            <div>No messages yet</div>
            <div style={{ fontSize: 12.5 }}>Send the first message below</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {selectMode ? (
        <div className="selection-bottom-bar">
          <button
            className="selection-bottom-bar__btn"
            disabled={selectedMessages.length !== 1}
            onClick={() => { setReplyingTo(selectedMessages[0]); clearSelection(); }}
          >
            ↩️ Reply
          </button>
          <button className="selection-bottom-bar__btn" onClick={() => setForwardIds(Array.from(selectedIds))}>
            ➡️ Forward
          </button>
        </div>
      ) : (
        <MessageInput chatId={chat.id} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} readOnly={chat.canPost === false} />
      )}

      {actionMessage && (
        <MessageActionSheet
          message={actionMessage}
          isOwn={actionMessage.senderId === user.id}
          isPinned={pinnedMessages.some((pm) => pm.id === actionMessage.id)}
          currentUserId={user.id}
          quickReactions={user.quickReactions}
          canEdit={actionMessage.senderId === user.id && actionMessage.type === 'text'}
          onClose={() => setActionMessage(null)}
          onReact={(emoji) => handleReact(actionMessage.id, emoji)}
          onReply={() => setReplyingTo(actionMessage)}
          onCopy={() => actionMessage.content && navigator.clipboard?.writeText(actionMessage.content).catch(() => {})}
          onForward={() => setForwardIds([actionMessage.id])}
          onPin={() => pinMessage(actionMessage.id).catch(() => alert('Could not pin message'))}
          onUnpin={() => unpinMessage(actionMessage.id).catch(() => alert('Could not unpin message'))}
          onEdit={() => { setEditingId(actionMessage.id); setEditDraft(actionMessage.content || ''); }}
          onDelete={() => handleDelete(actionMessage.id)}
          onSelect={() => setSelectedIds(new Set([actionMessage.id]))}
        />
      )}

      {forwardIds && <ForwardModal messageIds={forwardIds} onClose={() => { setForwardIds(null); clearSelection(); }} />}
    </div>
  );
}
