const { verifyToken } = require('../utils');
const db = require('../db');
const messageService = require('../services/messageService');

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
          if (ack) ack({ error: 'Aap is chat ke member nahi hain' });
          return;
        }
        if (!messageService.canPost(chatId, userId)) {
          if (ack) ack({ error: 'Is channel me sirf owner/admin hi post kar sakte hain' });
          return;
        }
        const message = messageService.createMessage({
          chatId, senderId: userId, type: type || 'text', content, fileUrl, fileName, fileSize, replyToId
        });
        io.to(`chat:${chatId}`).emit('message:new', { ...message, tempId });
        if (ack) ack({ message: { ...message, tempId } });
      } catch (e) {
        console.error('message:send error', e);
        if (ack) ack({ error: 'Message bhejne me error aaya' });
      }
    });

    socket.on('message:edit', (payload, ack) => {
      try {
        const { messageId, content } = payload;
        const message = messageService.editMessage(messageId, userId, content);
        io.to(`chat:${message.chatId}`).emit('message:updated', message);
        if (ack) ack({ message });
      } catch (e) {
        if (ack) ack({ error: 'Edit nahi ho paya' });
      }
    });

    socket.on('message:delete', (payload, ack) => {
      try {
        const { messageId } = payload;
        const message = messageService.deleteMessage(messageId, userId);
        io.to(`chat:${message.chatId}`).emit('message:updated', message);
        if (ack) ack({ message });
      } catch (e) {
        if (ack) ack({ error: 'Delete nahi ho paya' });
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
