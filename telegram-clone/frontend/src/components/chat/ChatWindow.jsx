import { useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import MessageInput from './MessageInput';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';

export default function ChatWindow({ chat, onBack }) {
  const { user } = useAuth();
  const { messagesByChat, hasMoreByChat, typingByChat, editMessage, deleteMessage, reactToMessage, loadMoreMessages } = useChat();
  const messages = messagesByChat[chat.id] || [];
  const hasMore = hasMoreByChat[chat.id];
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const prevChatId = useRef(chat.id);

  useEffect(() => {
    if (prevChatId.current !== chat.id) {
      prevChatId.current = chat.id;
      setReplyingTo(null);
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

  const handleEdit = (messageId, content) => {
    editMessage(messageId, content).catch(() => alert('Could not edit message'));
  };

  const handleDelete = (messageId) => {
    if (confirm('Delete this message?')) {
      deleteMessage(messageId).catch(() => alert('Could not delete message'));
    }
  };

  const handleReact = (messageId, emoji) => {
    reactToMessage(messageId, emoji).catch(() => {});
  };

  let lastDateKey = null;

  return (
    <div className="chat-panel">
      <ChatHeader chat={chat} typingNames={typingNames} onBack={onBack} onShowInfo={() => {}} />

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
            <div key={m.id}>
              {showDate && <DateSeparator ts={m.createdAt} />}
              <MessageBubble
                message={m}
                isOwn={isOwn}
                senderName={memberNameById[m.senderId] || 'Member'}
                showSenderName={showSenderName}
                currentUserId={user.id}
                quickReactions={user.quickReactions}
                onReply={setReplyingTo}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReact={handleReact}
                replyPreview={replyMsg ? {
                  senderName: replyMsg.senderId === user.id ? 'You' : (memberNameById[replyMsg.senderId] || 'Member'),
                  text: replyMsg.deleted ? 'Deleted message' : (replyMsg.content || 'Media message')
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

      <MessageInput chatId={chat.id} replyingTo={replyingTo} onCancelReply={() => setReplyingTo(null)} readOnly={chat.canPost === false} />
    </div>
  );
}
