const db = require('../db');
const { id } = require('../utils');

const STORY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h, same as Telegram/Instagram stories

// Adds a new profile photo to a user's avatar gallery (never overwrites an
// older one — Telegram keeps your whole profile-photo history swipeable)
// and keeps users.avatar_url mirroring the newest one, so every other part
// of the app that just wants "the" current avatar keeps working unchanged.
function addAvatar(userId, fileUrl) {
  const avatarId = id();
  const now = Date.now();
  db.prepare('INSERT INTO user_avatars (id, user_id, file_url, created_at) VALUES (?, ?, ?, ?)').run(avatarId, userId, fileUrl, now);
  db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(fileUrl, userId);
  return getAvatarHistory(userId);
}

function getAvatarHistory(userId) {
  const rows = db.prepare('SELECT id, file_url, created_at FROM user_avatars WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return rows.map((r) => ({ id: r.id, url: r.file_url, createdAt: r.created_at }));
}

function createPost(userId, { type = 'photo', fileUrl, fileName = null, fileSize = null, caption = '' }) {
  const postId = id();
  const now = Date.now();
  db.prepare(`INSERT INTO posts (id, user_id, type, file_url, file_name, file_size, caption, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(postId, userId, type, fileUrl, fileName, fileSize, caption, now);
  return getPost(postId);
}

function getPost(postId) {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!p) return null;
  return mapPost(p);
}

function mapPost(p) {
  return {
    id: p.id,
    userId: p.user_id,
    type: p.type,
    fileUrl: p.file_url,
    fileName: p.file_name,
    fileSize: p.file_size,
    caption: p.caption || '',
    archived: !!p.archived,
    createdAt: p.created_at
  };
}

function getPosts(userId, { archived = false } = {}) {
  const rows = db.prepare('SELECT * FROM posts WHERE user_id = ? AND archived = ? ORDER BY created_at DESC').all(userId, archived ? 1 : 0);
  return rows.map(mapPost);
}

function setPostArchived(postId, userId, archived) {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!p) throw new Error('NOT_FOUND');
  if (p.user_id !== userId) throw new Error('FORBIDDEN');
  db.prepare('UPDATE posts SET archived = ? WHERE id = ?').run(archived ? 1 : 0, postId);
  return getPost(postId);
}

function deletePost(postId, userId) {
  const p = db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!p) throw new Error('NOT_FOUND');
  if (p.user_id !== userId) throw new Error('FORBIDDEN');
  db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
}

// The posts still within their 24h "story" window — what the full-screen
// story viewer plays through when you tap an avatar with an active ring.
function getActiveStoryPosts(userId) {
  const since = Date.now() - STORY_WINDOW_MS;
  const rows = db.prepare('SELECT * FROM posts WHERE user_id = ? AND archived = 0 AND created_at >= ? ORDER BY created_at ASC').all(userId, since);
  return rows.map(mapPost);
}

function hasActiveStory(userId) {
  return getActiveStoryPosts(userId).length > 0;
}

// Bundles everything the profile screen needs about a user's own posts /
// photo history on top of the plain publicUser() fields.
function getProfileExtras(userId) {
  return {
    avatarHistory: getAvatarHistory(userId),
    hasActiveStory: hasActiveStory(userId),
    storyPosts: getActiveStoryPosts(userId)
  };
}

// Two users can see each other's stories once either one has added the
// other as a contact (mirrors how contacts get created in this app — a
// one-directional "add", but either direction is enough to unlock viewing,
// same as a normal DM relationship implies knowing each other).
function areContacts(userIdA, userIdB) {
  if (userIdA === userIdB) return true;
  const row = db.prepare(`SELECT 1 FROM contacts
    WHERE (owner_id = ? AND contact_id = ?) OR (owner_id = ? AND contact_id = ?) LIMIT 1`)
    .get(userIdA, userIdB, userIdB, userIdA);
  return !!row;
}

module.exports = {
  addAvatar, getAvatarHistory, createPost, getPost, getPosts, setPostArchived, deletePost,
  getActiveStoryPosts, hasActiveStory, getProfileExtras, areContacts, STORY_WINDOW_MS
};
