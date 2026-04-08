import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "rag.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Singleton across hot-reloads in dev
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
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    UNIQUE NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
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

    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      role        TEXT NOT NULL,
      content     TEXT NOT NULL,
      sources     TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default categories
  const insert = db.prepare(
    "INSERT OR IGNORE INTO categories (name) VALUES (?)"
  );
  ["Legal", "Finance", "HR", "Technical", "General"].forEach((n) =>
    insert.run(n)
  );
}

export function getDb(): Database.Database {
  if (!globalDb.__db) {
    globalDb.__db = new Database(DB_PATH);
    init(globalDb.__db);
  }
  return globalDb.__db;
}
