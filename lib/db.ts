import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "rag.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const globalDb = global as unknown as { __db?: Database.Database };

function init(db: Database.Database) {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    UNIQUE NOT NULL,
      description TEXT    DEFAULT '',
      summary     TEXT    DEFAULT NULL,
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

    CREATE INDEX IF NOT EXISTS idx_conversations_category ON conversations(category_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

    -- ── Phase 2: Collaboration ─────────────────────────────────────────────

    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    UNIQUE NOT NULL,
      email           TEXT    UNIQUE NOT NULL,
      password_hash   TEXT,
      role            TEXT    DEFAULT 'member',   -- 'admin' | 'member'
      avatar_url      TEXT    DEFAULT NULL,
      oauth_provider  TEXT    DEFAULT NULL,        -- 'google' | NULL
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
      role       TEXT    DEFAULT 'member',   -- 'owner' | 'admin' | 'member'
      joined_at  TEXT    DEFAULT (datetime('now')),
      PRIMARY KEY (team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS category_members (
      category_id INTEGER NOT NULL,
      user_id     INTEGER NOT NULL,
      role        TEXT    DEFAULT 'viewer',  -- 'owner' | 'editor' | 'viewer'
      added_at    TEXT    DEFAULT (datetime('now')),
      PRIMARY KEY (category_id, user_id),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      document_id     INTEGER DEFAULT NULL,
      conversation_id INTEGER DEFAULT NULL,
      content         TEXT    NOT NULL,
      created_at      TEXT    DEFAULT (datetime('now')),
      updated_at      TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id)         REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id)     REFERENCES documents(id) ON DELETE CASCADE,
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

    CREATE INDEX IF NOT EXISTS idx_audit_user     ON audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_comments_doc   ON comments(document_id);
    CREATE INDEX IF NOT EXISTS idx_comments_conv  ON comments(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_team_members   ON team_members(user_id);

    -- Full-text chunks table used for BM25 keyword search (hybrid retrieval)
    CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
      content,
      filename UNINDEXED,
      category UNINDEXED,
      document_id UNINDEXED,
      chunk_index UNINDEXED,
      tokenize = 'porter unicode61'
    );
  `);

  // Migrate existing tables (add columns if missing)
  try { db.exec("ALTER TABLE categories ADD COLUMN description TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE categories ADD COLUMN summary TEXT DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE categories ADD COLUMN owner_id INTEGER DEFAULT NULL"); } catch {}
  try { db.exec("ALTER TABLE messages ADD COLUMN conversation_id INTEGER"); } catch {}
  try { db.exec("ALTER TABLE messages ADD COLUMN suggestions TEXT"); } catch {}
  try { db.exec("ALTER TABLE conversations ADD COLUMN owner_id INTEGER DEFAULT NULL"); } catch {}

  // Seed a default admin user if no users exist yet
  const userCount = (db.prepare("SELECT COUNT(*) as n FROM users").get() as { n: number }).n;
  if (userCount === 0) {
    const bcrypt = require("bcryptjs");
    const hash = bcrypt.hashSync(process.env.LOGIN_PASSWORD ?? "admin123", 12);
    const username = process.env.LOGIN_USERNAME ?? "admin";
    db.prepare(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
    ).run(username, `${username}@cognibase.local`, hash);
  }
}

export function getDb(): Database.Database {
  if (!globalDb.__db) {
    globalDb.__db = new Database(DB_PATH);
    init(globalDb.__db);
  }
  return globalDb.__db;
}
