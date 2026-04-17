# CogniBase — Database Schema

SQLite (`better-sqlite3`) · WAL mode · Foreign keys ON  
File: `data/rag.db`

---

## Entity-Relationship Overview

```
users ──< team_members >── teams
  │
  ├──< category_members >── categories ──< documents ──< chunks_fts (FTS5)
  │                              │
  │                              └──< conversations ──< messages
  │                                        │
  └──< comments ──────────────────────────┘
  │
  └──< audit_log
```

---

## Tables

### `users`
Stores all registered accounts. Supports local password auth and Google OAuth.

| Column          | Type    | Constraints              | Description                          |
|-----------------|---------|--------------------------|--------------------------------------|
| `id`            | INTEGER | PK AUTOINCREMENT         | Surrogate key                        |
| `username`      | TEXT    | UNIQUE NOT NULL          | Display name / login handle          |
| `email`         | TEXT    | UNIQUE NOT NULL          | Email address                        |
| `password_hash` | TEXT    | nullable                 | bcrypt hash (null for OAuth-only)    |
| `role`          | TEXT    | DEFAULT `'member'`       | `'admin'` or `'member'`              |
| `avatar_url`    | TEXT    | nullable                 | Profile picture URL (OAuth-sourced)  |
| `oauth_provider`| TEXT    | nullable                 | `'google'` or NULL                   |
| `oauth_id`      | TEXT    | nullable                 | Provider's user ID                   |
| `invited_by`    | INTEGER | FK → users(id)           | User who created this account        |
| `created_at`    | TEXT    | DEFAULT `datetime('now')`| ISO-8601 timestamp                   |

---

### `teams`
Groups of users that can share access to knowledge bases.

| Column        | Type    | Constraints              | Description              |
|---------------|---------|--------------------------|--------------------------|
| `id`          | INTEGER | PK AUTOINCREMENT         |                          |
| `name`        | TEXT    | NOT NULL                 | Display name             |
| `slug`        | TEXT    | UNIQUE NOT NULL          | URL-safe identifier      |
| `description` | TEXT    | DEFAULT `''`             |                          |
| `created_by`  | INTEGER | FK → users(id) CASCADE   | Owner/creator            |
| `created_at`  | TEXT    | DEFAULT `datetime('now')`|                          |

---

### `team_members`
Many-to-many join: which users belong to which team, with a role.

| Column      | Type    | Constraints                        | Description                              |
|-------------|---------|-------------------------------------|------------------------------------------|
| `team_id`   | INTEGER | PK, FK → teams(id) CASCADE         |                                          |
| `user_id`   | INTEGER | PK, FK → users(id) CASCADE         |                                          |
| `role`      | TEXT    | DEFAULT `'member'`                  | `'owner'` · `'admin'` · `'member'`      |
| `joined_at` | TEXT    | DEFAULT `datetime('now')`           |                                          |

**Composite PK:** `(team_id, user_id)`  
**Index:** `idx_team_members(user_id)`

---

### `categories`  *(Knowledge Bases)*
Top-level knowledge base containers. Each KB holds documents.

| Column        | Type    | Constraints              | Description                      |
|---------------|---------|--------------------------|----------------------------------|
| `id`          | INTEGER | PK AUTOINCREMENT         |                                  |
| `name`        | TEXT    | UNIQUE NOT NULL          | KB name (also used as LanceDB table name) |
| `description` | TEXT    | DEFAULT `''`             |                                  |
| `summary`     | TEXT    | nullable                 | AI-generated summary             |
| `owner_id`    | INTEGER | nullable FK → users(id)  | Creating user                    |
| `created_at`  | TEXT    | DEFAULT `datetime('now')`|                                  |

---

### `category_members`
Per-KB access control — which users can see/edit a knowledge base.

| Column        | Type    | Constraints                          | Description                                  |
|---------------|---------|---------------------------------------|----------------------------------------------|
| `category_id` | INTEGER | PK, FK → categories(id) CASCADE      |                                              |
| `user_id`     | INTEGER | PK, FK → users(id) CASCADE           |                                              |
| `role`        | TEXT    | DEFAULT `'viewer'`                    | `'owner'` · `'editor'` · `'viewer'`         |
| `added_at`    | TEXT    | DEFAULT `datetime('now')`             |                                              |

**Composite PK:** `(category_id, user_id)`

---

### `documents`
Uploaded files attached to a knowledge base.

| Column        | Type    | Constraints                        | Description                              |
|---------------|---------|------------------------------------|------------------------------------------|
| `id`          | INTEGER | PK AUTOINCREMENT                   |                                          |
| `category_id` | INTEGER | FK → categories(id) CASCADE        |                                          |
| `filename`    | TEXT    | NOT NULL                           | Original file name                       |
| `file_type`   | TEXT    | NOT NULL                           | Extension: `pdf`, `docx`, `txt`, etc.   |
| `size_bytes`  | INTEGER | NOT NULL                           |                                          |
| `status`      | TEXT    | DEFAULT `'processing'`             | `'processing'` · `'ready'` · `'error'`  |
| `created_at`  | TEXT    | DEFAULT `datetime('now')`          |                                          |

---

### `chunks_fts`  *(FTS5 Virtual Table)*
Full-text BM25 index over document chunks. Mirrors the vector store in LanceDB.  
Used for **hybrid retrieval** (BM25 keyword + semantic vector, fused via RRF).

| Column        | Indexed | Description                               |
|---------------|---------|-------------------------------------------|
| `content`     | YES     | Chunk text (tokenised by porter + unicode61) |
| `filename`    | NO      | Source document filename                  |
| `category`    | NO      | KB name (partition key for queries)       |
| `document_id` | NO      | FK to `documents.id`                      |
| `chunk_index` | NO      | Position within the document              |

**Tokeniser:** `porter unicode61` (stemming + Unicode normalisation)  
**BM25 score** returned via `bm25(chunks_fts)` — lower = more relevant.

---

### `conversations`
Chat threads scoped to a knowledge base.

| Column        | Type    | Constraints                        | Description          |
|---------------|---------|------------------------------------|----------------------|
| `id`          | INTEGER | PK AUTOINCREMENT                   |                      |
| `category_id` | INTEGER | FK → categories(id) CASCADE        |                      |
| `owner_id`    | INTEGER | nullable FK → users(id)            | Creating user        |
| `title`       | TEXT    | DEFAULT `'New conversation'`       | Auto-set from Q1     |
| `created_at`  | TEXT    | DEFAULT `datetime('now')`          |                      |
| `updated_at`  | TEXT    | DEFAULT `datetime('now')`          |                      |

**Index:** `idx_conversations_category(category_id)`

---

### `messages`
Individual chat turns within a conversation.

| Column            | Type    | Constraints                          | Description                             |
|-------------------|---------|---------------------------------------|-----------------------------------------|
| `id`              | INTEGER | PK AUTOINCREMENT                      |                                         |
| `category_id`     | INTEGER | nullable                              | Denormalised for legacy queries         |
| `conversation_id` | INTEGER | FK → conversations(id)               |                                         |
| `role`            | TEXT    | NOT NULL                              | `'user'` or `'assistant'`              |
| `content`         | TEXT    | NOT NULL                              | Message text                            |
| `sources`         | TEXT    | nullable                              | JSON array of `{file, excerpt, score}`  |
| `suggestions`     | TEXT    | nullable                              | JSON array of follow-up question strings|
| `created_at`      | TEXT    | DEFAULT `datetime('now')`             |                                         |

**Index:** `idx_messages_conversation(conversation_id)`

---

### `comments`
User annotations on documents or conversations.

| Column            | Type    | Constraints                          | Description                    |
|-------------------|---------|---------------------------------------|--------------------------------|
| `id`              | INTEGER | PK AUTOINCREMENT                      |                                |
| `user_id`         | INTEGER | FK → users(id) CASCADE               | Author                         |
| `document_id`     | INTEGER | nullable FK → documents(id) CASCADE  | Linked document (if any)       |
| `conversation_id` | INTEGER | nullable FK → conversations(id) CASCADE | Linked conversation (if any)|
| `content`         | TEXT    | NOT NULL                              | Comment text                   |
| `created_at`      | TEXT    | DEFAULT `datetime('now')`             |                                |
| `updated_at`      | TEXT    | DEFAULT `datetime('now')`             |                                |

**Indexes:** `idx_comments_doc(document_id)`, `idx_comments_conv(conversation_id)`  
**Constraint:** exactly one of `document_id` or `conversation_id` must be non-null (enforced at API layer).

---

### `audit_log`
Immutable event log for compliance and debugging.

| Column          | Type    | Constraints              | Description                                      |
|-----------------|---------|--------------------------|--------------------------------------------------|
| `id`            | INTEGER | PK AUTOINCREMENT         |                                                  |
| `user_id`       | INTEGER | nullable FK → users(id)  | Actor (`NULL` = system event)                    |
| `action`        | TEXT    | NOT NULL                 | Verb: `login`, `user_created`, `kb_member_added`, etc. |
| `resource_type` | TEXT    | NOT NULL                 | `user` · `category` · `document` · `team` · `comment` |
| `resource_id`   | TEXT    | nullable                 | String ID of the affected resource               |
| `metadata`      | TEXT    | DEFAULT `'{}'`           | JSON blob with extra context                     |
| `created_at`    | TEXT    | DEFAULT `datetime('now')`|                                                  |

**Indexes:** `idx_audit_user(user_id)`, `idx_audit_resource(resource_type, resource_id)`

---

### `settings`
Key-value store for application-wide settings (LLM provider, API key, RAG params).

| Column  | Type | Constraints | Description |
|---------|------|-------------|-------------|
| `key`   | TEXT | PK          | Setting name |
| `value` | TEXT | NOT NULL    | JSON-encoded value |

---

## LanceDB (Vector Store)

Stored in `data/vectors/` alongside the SQLite file.  
Managed by `@lancedb/lancedb`.

### Table: `chunks`  (one table per knowledge base, named after the KB)

| Field         | Type          | Description                           |
|---------------|---------------|---------------------------------------|
| `vector`      | Float32[384]  | Embedding from `all-MiniLM-L6-v2`     |
| `content`     | String        | Chunk text                            |
| `filename`    | String        | Source document filename              |
| `category`    | String        | KB name (partition label)             |
| `document_id` | Int32         | FK to `documents.id`                  |
| `chunk_index` | Int32         | Position within the document          |

**Embedding model:** `Xenova/all-MiniLM-L6-v2` (ONNX, runs locally — no external API)  
**Dimension:** 384  
**Distance metric:** Cosine similarity

---

## Hybrid Retrieval Pipeline

```
Query
  ├─► BM25  (FTS5 chunks_fts)   → top-K keyword results + rank
  └─► ANN   (LanceDB cosine)    → top-K vector results + rank
            │
            ▼
     Reciprocal Rank Fusion  (k = 60)
            │
            ▼
     Deduplicated, re-ranked chunks
            │
            ▼
     LLM prompt + answer (Anthropic / OpenAI)
            │
            ▼
     SSE stream → client  (text · sources · suggestions · conversation_id)
```

---

## Migration Strategy

Schema changes are applied at startup via `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN` wrapped in `try/catch` — enabling zero-downtime upgrades on existing databases without a migration runner.

---

*Generated: 2026-04-17 — CogniBase v2.0 (Phase 2: Collaboration)*
