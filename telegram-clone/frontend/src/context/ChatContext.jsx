import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import http from '../api/http';
import { getSocket } from '../api/socket';
import { useAuth } from './AuthContext';
import { initNotifications, notifyNewMessage, registerPushIfConfigured } from '../utils/notifications';

function messagePreviewText(message) {
  if (message.deleted) return 'This message was deleted';
  if (message.type === 'image') return '📷 Photo';
  if (message.type === 'gif') return '🎞️ GIF';
  if (message.type === 'sticker') return '🧩 Sticker';
  if (message.type === 'video') return '🎬 Video';
  if (message.type === 'audio') return '🎙️ Audio message';
  if (message.type === 'file') return '📎 File';
  return message.content || 'New message';
}

const ChatContext = createContext(null);

// "Saved Messages" is always pinned to the very top, everything else sorts
// by most-recent activity.
function compareChats(a, b) {
  if (a.type === 'saved') return -1;
  if (b.type === 'saved') return 1;
  const at = a.lastMessage ? a.lastMessage.createdAt : a.createdAt;
  const bt = b.lastMessage ? b.lastMessage.createdAt : b.createdAt;
  return bt - at;
}

export function ChatProvider({ children }) {
  const { user, token } = useAuth();
  const [chats, setChats] = useState([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [hasMoreByChat, setHasMoreByChat] = useState({});
  const [typingByChat, setTypingByChat] = useState({});
  const activeChatIdRef = useRef(null);
  activeChatIdRef.current = activeChatId;
  const chatsRef = useRef([]);
  chatsRef.current = chats;

  useEffect(() => {
    if (!token) return;
    initNotifications();
    registerPushIfConfigured(http);
  }, [token]);

  const loadChats = useCallback(async () => {
    const res = await http.get('/chats');
    setChats(res.data.chats);
    setChatsLoaded(true);
    return res.data.chats;
  }, []);

  const upsertChat = useCallback((chat) => {
    setChats((prev) => {
      const idx = prev.findIndex((c) => c.id === chat.id);
      let next;
      if (idx === -1) next = [chat, ...prev];
      else {
        next = [...prev];
        next[idx] = { ...next[idx], ...chat };
      }
      return next.sort(compareChats);
    });
  }, []);

  const loadMessages = useCallback(async (chatId, before) => {
    const res = await http.get(`/chats/${chatId}/messages`, { params: before ? { before } : {} });
    setMessagesByChat((prev) => {
      const existing = prev[chatId] || [];
      const merged = before ? [...res.data.messages, ...existing] : res.data.messages;
      const dedup = Array.from(new Map(merged.map((m) => [m.id, m])).values()).sort((a, b) => a.seq - b.seq);
      return { ...prev, [chatId]: dedup };
    });
    setHasMoreByChat((prev) => ({ ...prev, [chatId]: res.data.hasMore }));
    return res.data;
  }, []);

  const markRead = useCallback((chatId, seq) => {
    const socket = getSocket();
    if (socket) socket.emit('message:read', { chatId, seq });
    else http.post(`/chats/${chatId}/read`, { seq }).catch(() => {});
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unreadCount: 0 } : c)));
  }, []);

  const openChat = useCallback(async (chatId) => {
    setActiveChatId(chatId);
    const socket = getSocket();
    if (socket) socket.emit('chat:join', { chatId });
    if (!messagesByChat[chatId]) {
      await loadMessages(chatId);
    }
    setMessagesByChat((prev) => {
      const msgs = prev[chatId] || [];
      if (msgs.length) {
        const lastSeq = msgs[msgs.length - 1].seq;
        markRead(chatId, lastSeq);
      }
      return prev;
    });
  }, [loadMessages, markRead, messagesByChat]);

  const sendMessage = useCallback((chatId, payload) => {
    const socket = getSocket();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = {
      id: tempId,
      tempId,
      seq: Number.MAX_SAFE_INTEGER,
      chatId,
      senderId: user.id,
      type: payload.type || 'text',
      content: payload.content ?? null,
      fileUrl: payload.fileUrl ?? null,
      fileName: payload.fileName ?? null,
      fileSize: payload.fileSize ?? null,
      replyToId: payload.replyToId ?? null,
      createdAt: Date.now(),
      pending: true
    };
    setMessagesByChat((prev) => ({ ...prev, [chatId]: [...(prev[chatId] || []), optimistic] }));

    socket.emit('message:send', { chatId, tempId, ...payload }, (response) => {
      if (response?.error) {
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] || []).map((m) => (m.tempId === tempId ? { ...m, failed: true, pending: false } : m))
        }));
      }
    });
  }, [user]);

  const editMessage = useCallback((messageId, content) => {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('message:edit', { messageId, content }, (res) => {
        if (res?.error) reject(res.error); else resolve(res.message);
      });
    });
  }, []);

  const deleteMessage = useCallback((messageId) => {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('message:delete', { messageId }, (res) => {
        if (res?.error) reject(res.error); else resolve(res.message);
      });
    });
  }, []);

  const reactToMessage = useCallback((messageId, emoji) => {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit('message:react', { messageId, emoji }, (res) => {
        if (res?.error) reject(res.error); else resolve(res.message);
      });
    });
  }, []);

  const startTyping = useCallback((chatId) => {
    const socket = getSocket();
    if (socket) socket.emit('typing:start', { chatId });
  }, []);

  const stopTyping = useCallback((chatId) => {
    const socket = getSocket();
    if (socket) socket.emit('typing:stop', { chatId });
  }, []);

  const createDirectChat = useCallback(async (userId) => {
    const res = await http.post('/chats/direct', { userId });
    upsertChat(res.data.chat);
    return res.data.chat;
  }, [upsertChat]);

  const createGroupChat = useCallback(async (name, memberIds) => {
    const res = await http.post('/chats/group', { name, memberIds });
    upsertChat(res.data.chat);
    return res.data.chat;
  }, [upsertChat]);

  const createChannelChat = useCallback(async (name, description, memberIds) => {
    const res = await http.post('/chats/channel', { name, description, memberIds });
    upsertChat(res.data.chat);
    return res.data.chat;
  }, [upsertChat]);

  const addChatMember = useCallback(async (chatId, userId) => {
    const res = await http.post(`/chats/${chatId}/members`, { userId });
    upsertChat(res.data.chat);
    return res.data.chat;
  }, [upsertChat]);

  const updateChatInfo = useCallback(async (chatId, patch) => {
    const res = await http.put(`/chats/${chatId}`, patch);
    upsertChat(res.data.chat);
    return res.data.chat;
  }, [upsertChat]);

  const searchUsers = useCallback(async (q) => {
    if (!q.trim()) return [];
    const res = await http.get('/users/search', { params: { q } });
    return res.data.users;
  }, []);

  const matchContacts = useCallback(async (phones) => {
    const res = await http.post('/users/contacts/match', { phones });
    return res.data.matches;
  }, []);

  const listContacts = useCallback(async () => {
    const res = await http.get('/users/contacts');
    return res.data.contacts;
  }, []);

  const searchGifs = useCallback(async (q) => {
    const res = await http.get('/gifs/search', { params: { q } });
    return res.data;
  }, []);

  const trendingGifs = useCallback(async () => {
    const res = await http.get('/gifs/trending');
    return res.data;
  }, []);

  // Real animated stickers (Telegram-style), same provider as GIFs.
  const searchStickers = useCallback(async (q) => {
    const res = await http.get('/gifs/stickers/search', { params: { q } });
    return res.data;
  }, []);

  const trendingStickers = useCallback(async () => {
    const res = await http.get('/gifs/stickers/trending');
    return res.data;
  }, []);

  const uploadFile = useCallback(async (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    const res = await http.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => onProgress && onProgress(Math.round((evt.loaded / evt.total) * 100))
    });
    return res.data;
  }, []);

  // Socket listeners
  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessagesByChat((prev) => {
        const existing = prev[message.chatId] || [];
        let next;
        if (message.tempId && existing.some((m) => m.tempId === message.tempId && m.pending)) {
          next = existing.map((m) => (m.tempId === message.tempId ? { ...message, pending: false } : m));
        } else if (existing.some((m) => m.id === message.id)) {
          next = existing.map((m) => (m.id === message.id ? message : m));
        } else {
          next = [...existing, message];
        }
        next.sort((a, b) => a.seq - b.seq);
        return { ...prev, [message.chatId]: next };
      });

      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === message.chatId);
        const isActive = activeChatIdRef.current === message.chatId;
        if (idx === -1) return prev;
        const next = [...prev];
        const chat = { ...next[idx] };
        chat.lastMessage = {
          id: message.id, seq: message.seq, senderId: message.senderId,
          type: message.type, content: message.content, deleted: message.deleted, createdAt: message.createdAt
        };
        if (message.senderId !== user.id && !isActive) {
          chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
        next[idx] = chat;
        return next.sort(compareChats);
      });

      if (activeChatIdRef.current === message.chatId && message.senderId !== user.id) {
        markRead(message.chatId, message.seq);
      }

      const isOpenAndVisible = activeChatIdRef.current === message.chatId && document.visibilityState === 'visible';
      if (message.senderId !== user.id && !isOpenAndVisible) {
        const chat = chatsRef.current.find((c) => c.id === message.chatId);
        if (chat) {
          const senderName = chat.members?.find((m) => m.id === message.senderId)?.name;
          const title = chat.type === 'group' || chat.type === 'channel'
            ? `${senderName ? senderName + ' • ' : ''}${chat.name}`
            : chat.name;
          notifyNewMessage({ title, body: messagePreviewText(message), chatId: message.chatId });
        }
      }
    };

    const handleUpdatedMessage = (message) => {
      setMessagesByChat((prev) => {
        const existing = prev[message.chatId] || [];
        return { ...prev, [message.chatId]: existing.map((m) => (m.id === message.id ? { ...m, ...message } : m)) };
      });
    };

    const handleRead = ({ chatId, userId, seq }) => {
      setMessagesByChat((prev) => {
        const existing = prev[chatId] || [];
        if (userId === user.id) return prev;
        return {
          ...prev,
          [chatId]: existing.map((m) => (m.seq <= seq ? { ...m, read: true } : m))
        };
      });
    };

    const handleTyping = ({ chatId, userId, typing }) => {
      if (userId === user.id) return;
      setTypingByChat((prev) => {
        const set = new Set(prev[chatId] || []);
        if (typing) set.add(userId); else set.delete(userId);
        return { ...prev, [chatId]: Array.from(set) };
      });
    };

    const handlePresence = ({ userId, status, lastSeen }) => {
      setChats((prev) => prev.map((c) => ({
        ...c,
        members: c.members?.map((m) => (m.id === userId ? { ...m, status, lastSeen } : m)),
        peer: c.peer && c.peer.id === userId ? { ...c.peer, status, lastSeen } : c.peer
      })));
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleUpdatedMessage);
    socket.on('message:read', handleRead);
    socket.on('typing:update', handleTyping);
    socket.on('presence:update', handlePresence);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleUpdatedMessage);
      socket.off('message:read', handleRead);
      socket.off('typing:update', handleTyping);
      socket.off('presence:update', handlePresence);
    };
  }, [token, user, markRead]);

  useEffect(() => {
    if (token) loadChats().catch(() => {});
  }, [token, loadChats]);

  const value = {
    chats, chatsLoaded, activeChatId, messagesByChat, hasMoreByChat, typingByChat,
    loadChats, openChat, sendMessage, editMessage, deleteMessage, reactToMessage,
    startTyping, stopTyping, createDirectChat, createGroupChat, createChannelChat,
    addChatMember, updateChatInfo, searchUsers, matchContacts, listContacts, searchGifs, trendingGifs,
    searchStickers, trendingStickers, uploadFile,
    loadMoreMessages: loadMessages, setActiveChatId
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
