const db = require('../db');
const { id } = require('../utils');

function nextSeq(chatId) {
  db.prepare('INSERT OR IGNORE INTO chat_seq (chat_id, next_seq) VALUES (?, 1)').run(chatId);
  const row = db.prepare('SELECT next_seq FROM chat_seq WHERE chat_id = ?').get(chatId);
  db.prepare('UPDATE chat_seq SET next_seq = next_seq + 1 WHERE chat_id = ?').run(chatId);
  return row.next_seq;
}

function isMember(chatId, userId) {
  return !!db.prepare('SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
}

// Channels are broadcast-style: only the owner/admins can post, everyone else
// is a read-only subscriber. Direct chats, groups and the Saved Messages
// chat have no posting restriction beyond being a member.
function canPost(chatId, userId) {
  const chat = db.prepare('SELECT type FROM chats WHERE id = ?').get(chatId);
  if (!chat) return false;
  const member = db.prepare('SELECT role FROM chat_members WHERE chat_id = ? AND user_id = ?').get(chatId, userId);
  if (!member) return false;
  if (chat.type === 'channel') return member.role === 'owner' || member.role === 'admin';
  return true;
}

function createMessage({ chatId, senderId, type = 'text', content = null, fileUrl = null, fileName = null, fileSize = null, replyToId = null }) {
  if (!isMember(chatId, senderId)) throw new Error('NOT_A_MEMBER');
  if (!canPost(chatId, senderId)) throw new Error('READ_ONLY_CHANNEL');
  const messageId = id();
  const seq = nextSeq(chatId);
  const now = Date.now();
  db.prepare(`INSERT INTO messages (id, seq, chat_id, sender_id, type, content, file_url, file_name, file_size, reply_to_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    messageId, seq, chatId, senderId, type, content, fileUrl, fileName, fileSize, replyToId, now
  );
  db.prepare('UPDATE chat_members SET last_read_message_seq = MAX(last_read_message_seq, ?) WHERE chat_id = ? AND user_id = ?')
    .run(seq, chatId, senderId);
  return getMessage(messageId);
}

function getMessage(messageId) {
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!m) return null;
  return {
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
    createdAt: m.created_at
  };
}

function editMessage(messageId, userId, content) {
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!m) throw new Error('NOT_FOUND');
  if (m.sender_id !== userId) throw new Error('FORBIDDEN');
  db.prepare('UPDATE messages SET content = ?, edited_at = ? WHERE id = ?').run(content, Date.now(), messageId);
  return getMessage(messageId);
}

function deleteMessage(messageId, userId) {
  const m = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
  if (!m) throw new Error('NOT_FOUND');
  if (m.sender_id !== userId) throw new Error('FORBIDDEN');
  db.prepare('UPDATE messages SET deleted = 1, content = NULL, file_url = NULL, file_name = NULL WHERE id = ?').run(messageId);
  return getMessage(messageId);
}

function chatMemberIds(chatId) {
  return db.prepare('SELECT user_id FROM chat_members WHERE chat_id = ?').all(chatId).map(r => r.user_id);
}

module.exports = { createMessage, getMessage, editMessage, deleteMessage, isMember, canPost, chatMemberIds };
