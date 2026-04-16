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

  // Migrate existing categories table (add columns if missing)
  try { db.exec("ALTER TABLE categories ADD COLUMN description TEXT DEFAULT ''"); } catch {}
  try { db.exec("ALTER TABLE categories ADD COLUMN summary TEXT DEFAULT NULL"); } catch {}
  // Migrate existing messages table
  try { db.exec("ALTER TABLE messages ADD COLUMN conversation_id INTEGER"); } catch {}
  try { db.exec("ALTER TABLE messages ADD COLUMN suggestions TEXT"); } catch {}
}

export function getDb(): Database.Database {
  if (!globalDb.__db) {
    globalDb.__db = new Database(DB_PATH);
    init(globalDb.__db);
  }
  return globalDb.__db;
}
