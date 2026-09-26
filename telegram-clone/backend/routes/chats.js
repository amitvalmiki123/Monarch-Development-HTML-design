const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const { id, pickColor, publicUser } = require('../utils');

const router = express.Router();

function ensureSeqRow(chatId) {
  db.prepare('INSERT OR IGNORE INTO chat_seq (chat_id, next_seq) VALUES (?, 1)').run(chatId);
}

function isMember(chatId, userId) {
  return !!db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
}

// Every user gets exactly one 'Saved Messages' chat (a self-chat, like
// Telegram) that is created lazily the first time their chat list loads.
function ensureSavedChat(userId) {
  const existing = db.prepare(`SELECT c.* FROM chats c JOIN chat_members cm ON cm.chat_id = c.id
    WHERE c.type = 'saved' AND cm.user_id = ?`).get(userId);
  if (existing) return existing;
  const chatId = id();
  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO chats (id, type, name, avatar_color, description, created_by, created_at)
      VALUES (?, 'saved', 'Saved Messages', '#B08D57', '', ?, ?)`).run(chatId, userId, now);
    db.prepare('INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(chatId, userId, 'owner', now);
    ensureSeqRow(chatId);
  });
  tx();
  return db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
}

function chatSummary(chat, currentUserId) {
  const members = db.prepare(`SELECT u.id, u.username, u.name, u.avatar_color, u.avatar_url, u.status, u.last_seen, cm.role
    FROM chat_members cm JOIN users u ON u.id = cm.user_id WHERE cm.chat_id = ?`).all(chat.id);

  const lastMsg = db.prepare(`SELECT * FROM messages WHERE chat_id = ? ORDER BY seq DESC LIMIT 1`).get(chat.id);
  const myMember = db.prepare('SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat.id, currentUserId);
  const unread = db.prepare(`SELECT COUNT(*) as c FROM messages WHERE chat_id = ? AND seq > ? AND sender_id != ? AND deleted = 0`)
    .get(chat.id, myMember ? myMember.last_read_message_seq : 0, currentUserId).c;

  let title = chat.name;
  let avatarColor = chat.avatar_color;
  let peer = null;
  if (chat.type === 'direct') {
    peer = members.find(m => m.id !== currentUserId) || members[0];
    title = peer ? (peer.name) : 'Deleted User';
    avatarColor = peer ? peer.avatar_color : avatarColor;
  } else if (chat.type === 'saved') {
    title = 'Saved Messages';
  }

  const canPost = chat.type === 'channel'
    ? !!(myMember && (myMember.role === 'owner' || myMember.role === 'admin'))
    : true;

  return {
    id: chat.id,
    type: chat.type,
    name: title,
    avatarColor,
    description: chat.description || '',
    peer: peer ? publicUser(peer) : null,
    members: members.map(m => ({ id: m.id, username: m.username, name: m.name, avatarColor: m.avatar_color, avatarUrl: m.avatar_url || null, status: m.status, lastSeen: m.last_seen, role: m.role })),
    myRole: myMember ? myMember.role : null,
    canPost,
    subscriberCount: chat.type === 'channel' ? members.length : undefined,
    lastMessage: lastMsg ? {
      id: lastMsg.id,
      seq: lastMsg.seq,
      senderId: lastMsg.sender_id,
      type: lastMsg.type,
      content: lastMsg.deleted ? null : lastMsg.content,
      deleted: !!lastMsg.deleted,
      createdAt: lastMsg.created_at
    } : null,
    unreadCount: unread,
    createdAt: chat.created_at
  };
}

router.get('/', auth, (req, res) => {
  ensureSavedChat(req.user.id);
  const chats = db.prepare(`SELECT c.* FROM chats c JOIN chat_members cm ON cm.chat_id = c.id WHERE cm.user_id = ?`).all(req.user.id);
  const summaries = chats.map(c => chatSummary(c, req.user.id));
  summaries.sort((a, b) => {
    if (a.type === 'saved') return -1;
    if (b.type === 'saved') return 1;
    const at = a.lastMessage ? a.lastMessage.createdAt : a.createdAt;
    const bt = b.lastMessage ? b.lastMessage.createdAt : b.createdAt;
    return bt - at;
  });
  res.json({ chats: summaries });
});

router.post('/direct', auth, (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: "You can't start a chat with yourself" });

  const existing = db.prepare(`SELECT c.* FROM chats c
    JOIN chat_members m1 ON m1.chat_id = c.id AND m1.user_id = ?
    JOIN chat_members m2 ON m2.chat_id = c.id AND m2.user_id = ?
    WHERE c.type = 'direct'`).get(req.user.id, target.id);

  if (existing) return res.json({ chat: chatSummary(existing, req.user.id) });

  const chatId = id();
  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO chats (id, type, name, avatar_color, created_by, created_at) VALUES (?, ?, NULL, ?, ?, ?)')
      .run(chatId, 'direct', pickColor(chatId), req.user.id, now);
    db.prepare('INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(chatId, req.user.id, 'member', now);
    db.prepare('INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(chatId, target.id, 'member', now);
    ensureSeqRow(chatId);
    db.prepare('INSERT OR IGNORE INTO contacts (owner_id, contact_id, created_at) VALUES (?, ?, ?)').run(req.user.id, target.id, now);
  });
  tx();
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  res.json({ chat: chatSummary(chat, req.user.id) });
});

router.post('/group', auth, (req, res) => {
  const { name, memberIds } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Enter a group name' });
  const ids = Array.from(new Set([...(memberIds || []), req.user.id]));
  const chatId = id();
  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO chats (id, type, name, avatar_color, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(chatId, 'group', name.trim(), pickColor(chatId), req.user.id, now);
    for (const uid of ids) {
      const exists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(uid);
      if (!exists) continue;
      db.prepare('INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
        .run(chatId, uid, uid === req.user.id ? 'admin' : 'member', now);
    }
    ensureSeqRow(chatId);
  });
  tx();
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  res.status(201).json({ chat: chatSummary(chat, req.user.id) });
});

router.post('/channel', auth, (req, res) => {
  const { name, description, memberIds } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Enter a channel name' });
  const ids = Array.from(new Set(memberIds || [])).filter((uid) => uid !== req.user.id);
  const chatId = id();
  const now = Date.now();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO chats (id, type, name, avatar_color, description, created_by, created_at)
      VALUES (?, 'channel', ?, ?, ?, ?, ?)`).run(chatId, name.trim(), pickColor(chatId), (description || '').trim(), req.user.id, now);
    db.prepare('INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)').run(chatId, req.user.id, 'owner', now);
    for (const uid of ids) {
      const exists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(uid);
      if (!exists) continue;
      db.prepare('INSERT INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
        .run(chatId, uid, 'subscriber', now);
    }
    ensureSeqRow(chatId);
  });
  tx();
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
  res.status(201).json({ chat: chatSummary(chat, req.user.id) });
});

router.get('/:chatId', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.chatId);
  if (!chat || !isMember(chat.id, req.user.id)) return res.status(404).json({ error: 'Chat not found' });
  res.json({ chat: chatSummary(chat, req.user.id) });
});

router.put('/:chatId', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.chatId);
  if (!chat || !isMember(chat.id, req.user.id)) return res.status(404).json({ error: 'Chat not found' });
  if (chat.type !== 'group' && chat.type !== 'channel') return res.status(400).json({ error: 'Only groups/channels can be edited' });
  const membership = db.prepare('SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat.id, req.user.id);
  const allowedRoles = chat.type === 'channel' ? ['owner', 'admin'] : ['admin'];
  if (!allowedRoles.includes(membership.role)) return res.status(403).json({ error: 'Only an admin can edit' });
  const { name, avatarColor, description } = req.body;
  db.prepare('UPDATE chats SET name = COALESCE(?, name), avatar_color = COALESCE(?, avatar_color), description = COALESCE(?, description) WHERE id = ?')
    .run(name ?? null, avatarColor ?? null, description ?? null, chat.id);
  const updated = db.prepare('SELECT * FROM chats WHERE id = ?').get(chat.id);
  res.json({ chat: chatSummary(updated, req.user.id) });
});

router.post('/:chatId/members', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.chatId);
  if (!chat || !isMember(chat.id, req.user.id)) return res.status(404).json({ error: 'Chat not found' });
  if (chat.type !== 'group' && chat.type !== 'channel') return res.status(400).json({ error: 'Members can only be added to groups/channels' });
  const membership = db.prepare('SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat.id, req.user.id);
  if (chat.type === 'channel' && !['owner', 'admin'].includes(membership.role)) {
    return res.status(403).json({ error: 'Only a channel admin can add members/subscribers' });
  }
  const { userId } = req.body;
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const role = chat.type === 'channel' ? 'subscriber' : 'member';
  db.prepare('INSERT OR IGNORE INTO chat_members (chat_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)')
    .run(chat.id, userId, role, Date.now());
  const updated = db.prepare('SELECT * FROM chats WHERE id = ?').get(chat.id);
  res.json({ chat: chatSummary(updated, req.user.id) });
});

router.delete('/:chatId/members/:userId', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.chatId);
  if (!chat || !isMember(chat.id, req.user.id)) return res.status(404).json({ error: 'Chat not found' });
  const membership = db.prepare('SELECT * FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chat.id, req.user.id);
  if (req.params.userId !== req.user.id && !['admin', 'owner'].includes(membership.role)) {
    return res.status(403).json({ error: 'Only an admin can remove members' });
  }
  db.prepare('DELETE FROM chat_members WHERE chat_id = ? AND user_id = ?').run(chat.id, req.params.userId);
  res.json({ ok: true });
});

router.get('/:chatId/messages', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.chatId);
  if (!chat || !isMember(chat.id, req.user.id)) return res.status(404).json({ error: 'Chat not found' });
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  const before = req.query.before ? parseInt(req.query.before) : null;
  let rows;
  if (before) {
    rows = db.prepare('SELECT * FROM messages WHERE chat_id = ? AND seq < ? ORDER BY seq DESC LIMIT ?').all(chat.id, before, limit);
  } else {
    rows = db.prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY seq DESC LIMIT ?').all(chat.id, limit);
  }
  rows.reverse();

  const memberReads = db.prepare('SELECT user_id, last_read_message_seq FROM chat_members WHERE chat_id = ?').all(chat.id);
  const otherMaxRead = Math.max(0, ...memberReads.filter(m => m.user_id !== req.user.id).map(m => m.last_read_message_seq));

  res.json({
    messages: rows.map(m => ({
      id: m.id,
      seq: m.seq,
      chatId: m.chat_id,
      senderId: m.sender_id,
      type: m.type,
      content: m.deleted ? null : m.content,
      fileUrl: m.deleted ? null : m.file_url,
      fileName: m.deleted ? null : m.file_name,
      fileSize: m.file_size,
      replyToId: m.reply_to_id,
      editedAt: m.edited_at,
      deleted: !!m.deleted,
      createdAt: m.created_at,
      read: m.seq <= otherMaxRead
    })),
    hasMore: rows.length === limit
  });
});

router.post('/:chatId/read', auth, (req, res) => {
  const chat = db.prepare('SELECT * FROM chats WHERE id = ?').get(req.params.chatId);
  if (!chat || !isMember(chat.id, req.user.id)) return res.status(404).json({ error: 'Chat not found' });
  const { seq } = req.body;
  db.prepare('UPDATE chat_members SET last_read_message_seq = MAX(last_read_message_seq, ?) WHERE chat_id = ? AND user_id = ?')
    .run(seq || 0, chat.id, req.user.id);
  const io = req.app.get('io');
  io.to(`chat:${chat.id}`).emit('message:read', { chatId: chat.id, userId: req.user.id, seq });
  res.json({ ok: true });
});

module.exports = router;
