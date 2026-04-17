-- =============================================================================
--  CogniBase — SQLite Schema Dump
--  Version: 2.0 (Phase 2: Collaboration)
--  Generated: 2026-04-17
--
--  This file contains CREATE TABLE / INDEX statements only (no user data).
--  To apply to a fresh database:
--    sqlite3 data/rag.db < docs/schema.sql
--
--  The application also auto-applies this schema on startup via lib/db.ts.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- Core application tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    UNIQUE NOT NULL,
  description TEXT    DEFAULT '',
  summary     TEXT    DEFAULT NULL,
  owner_id    INTEGER DEFAULT NULL,
  created_at  TEXT    DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  filename    TEXT    NOT NULL,
  file_type   TEXT    NOT NULL,
  size_bytes  INTEGER NOT NULL,
  status      TEXT    DEFAULT 'processing',   -- 'processing' | 'ready' | 'error'
  created_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  owner_id    INTEGER DEFAULT NULL,
  title       TEXT    DEFAULT 'New conversation',
  created_at  TEXT    DEFAULT (datetime('now')),
  updated_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id     INTEGER,
  conversation_id INTEGER,
  role            TEXT NOT NULL,              -- 'user' | 'assistant'
  content         TEXT NOT NULL,
  sources         TEXT,                       -- JSON: [{file, excerpt, score}]
  suggestions     TEXT,                       -- JSON: [string, ...]
  created_at      TEXT DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- Phase 2: Collaboration tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    UNIQUE NOT NULL,
  email           TEXT    UNIQUE NOT NULL,
  password_hash   TEXT,                       -- bcrypt hash; NULL for OAuth-only accounts
  role            TEXT    DEFAULT 'member',   -- 'admin' | 'member'
  avatar_url      TEXT    DEFAULT NULL,
  oauth_provider  TEXT    DEFAULT NULL,       -- 'google' | NULL
  oauth_id        TEXT    DEFAULT NULL,       -- provider's user ID
  invited_by      INTEGER DEFAULT NULL,
  created_at      TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  slug        TEXT    UNIQUE NOT NULL,        -- URL-safe lowercase identifier
  description TEXT    DEFAULT '',
  created_by  INTEGER NOT NULL,
  created_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id    INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  role       TEXT    DEFAULT 'member',        -- 'owner' | 'admin' | 'member'
  joined_at  TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS category_members (
  category_id INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  role        TEXT    DEFAULT 'viewer',       -- 'owner' | 'editor' | 'viewer'
  added_at    TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (category_id, user_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)       ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  document_id     INTEGER DEFAULT NULL,       -- linked document (mutually exclusive with conversation_id)
  conversation_id INTEGER DEFAULT NULL,       -- linked conversation
  content         TEXT    NOT NULL,
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (document_id)     REFERENCES documents(id)     ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER DEFAULT NULL,         -- NULL = system event
  action        TEXT    NOT NULL,             -- e.g. 'login', 'user_created', 'kb_member_added'
  resource_type TEXT    NOT NULL,             -- 'user' | 'category' | 'document' | 'team' | 'comment'
  resource_id   TEXT    DEFAULT NULL,
  metadata      TEXT    DEFAULT '{}',         -- JSON blob
  created_at    TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- -----------------------------------------------------------------------------
-- Full-text search (BM25 hybrid retrieval)
-- -----------------------------------------------------------------------------

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  content,
  filename    UNINDEXED,
  category    UNINDEXED,
  document_id UNINDEXED,
  chunk_index UNINDEXED,
  tokenize = 'porter unicode61'
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_user             ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource         ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_comments_doc           ON comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_conv          ON comments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_team_members           ON team_members(user_id);
