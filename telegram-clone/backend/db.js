// Uses Node's built-in SQLite (node:sqlite, stable since Node 22.5+) instead
// of the native "better-sqlite3" module. This avoids any native compilation /
// prebuilt-binary download at install time (no node-gyp, no network fetch of
// headers or prebuilds needed) while keeping the same synchronous, easy API.
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'monarch_chat.sqlite'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');


db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#7C4DFF',
  bio TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('direct','group')),
  name TEXT,
  avatar_color TEXT DEFAULT '#B08D57',
  created_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  last_read_message_seq INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (chat_id, user_id),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  seq INTEGER,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to_id TEXT,
  edited_at INTEGER,
  deleted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS chat_seq (
  chat_id TEXT PRIMARY KEY,
  next_seq INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS contacts (
  owner_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (owner_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, seq);
CREATE INDEX IF NOT EXISTS idx_members_user ON chat_members(user_id);
`);

// node:sqlite's DatabaseSync has no built-in `.transaction()` helper like
// better-sqlite3 did, so provide a tiny drop-in replacement with the same
// call shape: `db.transaction(fn)` returns a function that runs fn inside a
// BEGIN/COMMIT (rolling back on error).
db.transaction = function transaction(fn) {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

module.exports = db;
