const { verifyToken } = require('../utils');
const db = require('../db');
const messageService = require('../services/messageService');
const { sendPushToUser } = require('../routes/push');

function messagePreviewText(message) {
  if (message.deleted) return 'This message was deleted';
  if (message.type === 'image') return 'Photo';
  if (message.type === 'gif') return 'GIF';
  if (message.type === 'sticker') return 'Sticker';
  if (message.type === 'video') return 'Video';
  if (message.type === 'audio') return 'Audio message';
  if (message.type === 'file') return 'File';
  return message.content || 'New message';
}

const onlineUsers = new Map(); // userId -> Set(socketId)

function setupSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const payload = token ? verifyToken(token) : null;
    if (!payload) return next(new Error('Authentication error'));
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
    if (!user) return next(new Error('Authentication error'));
    socket.user = user;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    const chatIds = db.prepare('SELECT chat_id FROM chat_members WHERE user_id = ?').all(userId).map(r => r.chat_id);
    chatIds.forEach(cid => socket.join(`chat:${cid}`));
    socket.join(`user:${userId}`);

    const wasOffline = onlineUsers.get(userId).size === 1;
    if (wasOffline) {
      db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(userId);
      chatIds.forEach(cid => io.to(`chat:${cid}`).emit('presence:update', { userId, status: 'online', lastSeen: null }));
    }

    socket.on('message:send', (payload, ack) => {
      try {
        const { chatId, tempId, type, content, fileUrl, fileName, fileSize, replyToId } = payload;
        if (!messageService.isMember(chatId, userId)) {
          if (ack) ack({ error: 'You are not a member of this chat' });
          return;
        }
        if (!messageService.canPost(chatId, userId)) {
          if (ack) ack({ error: 'Only the owner/admins can post in this channel' });
          return;
        }
        const message = messageService.createMessage({
          chatId, senderId: userId, type: type || 'text', content, fileUrl, fileName, fileSize, replyToId
        });
        io.to(`chat:${chatId}`).emit('message:new', { ...message, tempId });
        if (ack) ack({ message: { ...message, tempId } });

        // Fire-and-forget push notification to every other member — this is
        // a genuine no-op until a real Firebase project is configured (see
        // routes/push.js), so it's always safe to call.
        const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
        const chat = db.prepare('SELECT name, type FROM chats WHERE id = ?').get(chatId);
        const otherMemberIds = db.prepare('SELECT user_id FROM chat_members WHERE chat_id = ? AND user_id != ? AND muted = 0')
          .all(chatId, userId).map((r) => r.user_id);
        const title = chat && (chat.type === 'group' || chat.type === 'channel')
          ? `${sender?.name || 'Someone'} • ${chat.name}`
          : (sender?.name || 'New message');
        const body = messagePreviewText(message);
        otherMemberIds.forEach((memberId) => sendPushToUser(memberId, { title, body, chatId }));
      } catch (e) {
        console.error('message:send error', e);
        if (ack) ack({ error: 'Something went wrong sending the message' });
      }
    });

    socket.on('message:edit', (payload, ack) => {
      try {
        const { messageId, content } = payload;
        const message = messageService.editMessage(messageId, userId, content);
        io.to(`chat:${message.chatId}`).emit('message:updated', message);
        if (ack) ack({ message });
      } catch (e) {
        if (ack) ack({ error: 'Could not edit message' });
      }
    });

    socket.on('message:delete', (payload, ack) => {
      try {
        const { messageId } = payload;
        const message = messageService.deleteMessage(messageId, userId);
        io.to(`chat:${message.chatId}`).emit('message:updated', message);
        if (ack) ack({ message });
      } catch (e) {
        if (ack) ack({ error: 'Could not delete message' });
      }
    });

    socket.on('message:react', (payload, ack) => {
      try {
        const { messageId, emoji } = payload;
        const message = messageService.toggleReaction(messageId, userId, emoji);
        io.to(`chat:${message.chatId}`).emit('message:updated', message);
        if (ack) ack({ message });
      } catch (e) {
        if (ack) ack({ error: 'Could not save reaction' });
      }
    });

    // Forwards one message into one or more OTHER chats the user is a
    // member of — each target gets its own brand new message (with its own
    // id/seq/timestamp), broadcast exactly like a normal send so every
    // member (and push notifications) work identically to any other
    // message.
    socket.on('message:forward', (payload, ack) => {
      try {
        const { messageId, chatIds } = payload;
        const targets = Array.isArray(chatIds) ? chatIds : [chatIds];
        const sender = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);
        const results = targets.map((targetChatId) => {
          const message = messageService.forwardMessage(messageId, userId, targetChatId);
          io.to(`chat:${targetChatId}`).emit('message:new', message);
          const chat = db.prepare('SELECT name, type FROM chats WHERE id = ?').get(targetChatId);
          const otherMemberIds = db.prepare('SELECT user_id FROM chat_members WHERE chat_id = ? AND user_id != ? AND muted = 0')
            .all(targetChatId, userId).map((r) => r.user_id);
          const title = chat && (chat.type === 'group' || chat.type === 'channel')
            ? `${sender?.name || 'Someone'} • ${chat.name}`
            : (sender?.name || 'New message');
          otherMemberIds.forEach((memberId) => sendPushToUser(memberId, { title, body: messagePreviewText(message), chatId: targetChatId }));
          return message;
        });
        if (ack) ack({ messages: results });
      } catch (e) {
        if (ack) ack({ error: 'Could not forward message' });
      }
    });

    // Pins a message as the single banner shown under that chat's header —
    // pinning a new one silently replaces whatever was pinned before, same
    // as unpremium Telegram/WhatsApp behaviour.
    socket.on('message:pin', (payload, ack) => {
      try {
        const { messageId } = payload;
        const { chatId, message } = messageService.pinMessage(messageId, userId);
        io.to(`chat:${chatId}`).emit('chat:pinned', { chatId, message });
        if (ack) ack({ message });
      } catch (e) {
        if (ack) ack({ error: 'Could not pin message' });
      }
    });

    socket.on('message:unpin', (payload, ack) => {
      try {
        const { chatId } = payload;
        messageService.unpinMessage(chatId, userId);
        io.to(`chat:${chatId}`).emit('chat:pinned', { chatId, message: null });
        if (ack) ack({});
      } catch (e) {
        if (ack) ack({ error: 'Could not unpin message' });
      }
    });

    socket.on('message:read', (payload) => {
      const { chatId, seq } = payload;
      if (!messageService.isMember(chatId, userId)) return;
      db.prepare('UPDATE chat_members SET last_read_message_seq = MAX(last_read_message_seq, ?) WHERE chat_id = ? AND user_id = ?')
        .run(seq || 0, chatId, userId);
      io.to(`chat:${chatId}`).emit('message:read', { chatId, userId, seq });
    });

    socket.on('typing:start', (payload) => {
      const { chatId } = payload;
      socket.to(`chat:${chatId}`).emit('typing:update', { chatId, userId, typing: true });
    });

    socket.on('typing:stop', (payload) => {
      const { chatId } = payload;
      socket.to(`chat:${chatId}`).emit('typing:update', { chatId, userId, typing: false });
    });

    socket.on('chat:join', ({ chatId }) => {
      if (messageService.isMember(chatId, userId)) socket.join(`chat:${chatId}`);
    });

    socket.on('disconnect', () => {
      const set = onlineUsers.get(userId);
      if (set) {
        set.delete(socket.id);
        if (set.size === 0) {
          onlineUsers.delete(userId);
          const now = Date.now();
          db.prepare("UPDATE users SET status = 'offline', last_seen = ? WHERE id = ?").run(now, userId);
          chatIds.forEach(cid => io.to(`chat:${cid}`).emit('presence:update', { userId, status: 'offline', lastSeen: now }));
        }
      }
    });
  });
}

module.exports = setupSocket;
