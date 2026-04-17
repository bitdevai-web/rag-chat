#!/usr/bin/env bash
# =============================================================================
#  CogniBase — Database Migration Script
#  Usage: bash docs/migrate.sh [path/to/rag.db]
#
#  Works on both fresh and existing databases.
#  ALTER TABLE errors are suppressed (SQLite has no IF NOT EXISTS for columns).
# =============================================================================

set -euo pipefail

DB="${1:-data/rag.db}"

if [ ! -f "$DB" ] && [ ! -d "$(dirname "$DB")" ]; then
  echo "Creating directory $(dirname "$DB")..."
  mkdir -p "$(dirname "$DB")"
fi

echo "Migrating database: $DB"

# ── Step 1: Apply CREATE TABLE / INDEX (abort on real errors) ────────────────
sqlite3 "$DB" <<'SQL'
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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
  status      TEXT    DEFAULT 'processing',
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
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  sources         TEXT,
  suggestions     TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    UNIQUE NOT NULL,
  email           TEXT    UNIQUE NOT NULL,
  password_hash   TEXT,
  role            TEXT    DEFAULT 'member',
  avatar_url      TEXT    DEFAULT NULL,
  oauth_provider  TEXT    DEFAULT NULL,
  oauth_id        TEXT    DEFAULT NULL,
  invited_by      INTEGER DEFAULT NULL,
  created_at      TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  slug        TEXT    UNIQUE NOT NULL,
  description TEXT    DEFAULT '',
  created_by  INTEGER NOT NULL,
  created_at  TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id    INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  role       TEXT    DEFAULT 'member',
  joined_at  TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS category_members (
  category_id INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  role        TEXT    DEFAULT 'viewer',
  added_at    TEXT    DEFAULT (datetime('now')),
  PRIMARY KEY (category_id, user_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)     REFERENCES users(id)       ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL,
  document_id     INTEGER DEFAULT NULL,
  conversation_id INTEGER DEFAULT NULL,
  content         TEXT    NOT NULL,
  created_at      TEXT    DEFAULT (datetime('now')),
  updated_at      TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)         REFERENCES users(id)         ON DELETE CASCADE,
  FOREIGN KEY (document_id)     REFERENCES documents(id)     ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER DEFAULT NULL,
  action        TEXT    NOT NULL,
  resource_type TEXT    NOT NULL,
  resource_id   TEXT    DEFAULT NULL,
  metadata      TEXT    DEFAULT '{}',
  created_at    TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
  content,
  filename    UNINDEXED,
  category    UNINDEXED,
  document_id UNINDEXED,
  chunk_index UNINDEXED,
  tokenize = 'porter unicode61'
);

SQL

echo "Tables: OK"

# ── Step 2: ALTER TABLE column additions (errors suppressed — already exist) ─
alter_column() {
  sqlite3 "$DB" "$1" 2>/dev/null && echo "  + $2" || echo "  ~ $2 (already exists)"
}

echo "Running column migrations..."
alter_column "ALTER TABLE categories    ADD COLUMN description     TEXT    DEFAULT ''"    "categories.description"
alter_column "ALTER TABLE categories    ADD COLUMN summary         TEXT    DEFAULT NULL"  "categories.summary"
alter_column "ALTER TABLE categories    ADD COLUMN owner_id        INTEGER DEFAULT NULL"  "categories.owner_id"
alter_column "ALTER TABLE conversations ADD COLUMN owner_id        INTEGER DEFAULT NULL"  "conversations.owner_id"
alter_column "ALTER TABLE messages      ADD COLUMN conversation_id INTEGER"               "messages.conversation_id"
alter_column "ALTER TABLE messages      ADD COLUMN suggestions     TEXT"                  "messages.suggestions"

# ── Step 3: Indexes (must run AFTER column migrations) ───────────────────────
echo "Creating indexes..."
sqlite3 "$DB" <<'SQL'
CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation  ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_user             ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource         ON audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_comments_doc           ON comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_conv          ON comments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_team_members           ON team_members(user_id);
SQL
echo "Indexes: OK"

echo ""
echo "Migration complete: $DB"
echo ""
sqlite3 "$DB" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" | \
  awk 'BEGIN{print "Tables:"} {print "  •", $0}'
