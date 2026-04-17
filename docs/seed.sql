-- =============================================================================
--  CogniBase — Seed Data
--  Version: 2.0 (Phase 2)
--
--  Inserts a default admin account for development / first-run.
--  NOTE: The application auto-seeds this at startup (lib/db.ts) using the
--        LOGIN_USERNAME / LOGIN_PASSWORD environment variables, so you do not
--        need to run this manually.
--
--  To apply manually to a fresh database that already has the schema:
--    sqlite3 data/rag.db < docs/seed.sql
--
--  ⚠  Change the password immediately after first login in production.
--     Admin Panel → Users → click the user → PATCH /api/users/:id
-- =============================================================================

-- Default admin user
-- password_hash below is bcrypt of "admin123" (cost=12)
-- Replace with your own hash: node -e "require('bcryptjs').hash('yourpw',12).then(console.log)"
INSERT OR IGNORE INTO users (username, email, password_hash, role)
VALUES (
  'admin',
  'admin@cognibase.local',
  '$2b$12$REPLACE_THIS_WITH_A_REAL_BCRYPT_HASH_OF_YOUR_PASSWORD',
  'admin'
);
