-- ============================================================
-- CogniBase — Test User Seed
-- All accounts use password: Test@1234
--
-- Apply with:
--   sqlite3 data/rag.db < scripts/seed-test-users.sql
-- ============================================================

-- Ensure the default admin exists first (id = 1 is assumed as invited_by)
INSERT OR IGNORE INTO users (id, username, email, password_hash, role)
VALUES (
  1,
  'admin',
  'admin@cognibase.local',
  '$2b$12$placeholder_replace_with_real_hash',
  'admin'
);

-- ── Test Users ──────────────────────────────────────────────
-- priya_sharma | admin | Password: Test@1234
INSERT OR IGNORE INTO users (username, email, password_hash, role, invited_by)
VALUES (
  'priya_sharma',
  'priya.sharma@cognibase.local',
  '$2b$12$8NYmOG3EMcjoDW9.U9WegOngiRHue.sT.l0w3p3UCirYDQbZ5ljrS',
  'admin',
  1
);

-- rahul_verma | member | Password: Test@1234
INSERT OR IGNORE INTO users (username, email, password_hash, role, invited_by)
VALUES (
  'rahul_verma',
  'rahul.verma@cognibase.local',
  '$2b$12$5cPZZ6QsyM28in0f92T2C.HCfkR84xp6vpJ55x4jV54z0k/S5xc/S',
  'member',
  1
);

-- ananya_iyer | member | Password: Test@1234
INSERT OR IGNORE INTO users (username, email, password_hash, role, invited_by)
VALUES (
  'ananya_iyer',
  'ananya.iyer@cognibase.local',
  '$2b$12$GCxsW6cs918XLJHv5coBpOky5b1aBzpMczKUb3FuHGgSB7L7zMVjO',
  'member',
  1
);

-- karan_mehta | member | Password: Test@1234
INSERT OR IGNORE INTO users (username, email, password_hash, role, invited_by)
VALUES (
  'karan_mehta',
  'karan.mehta@cognibase.local',
  '$2b$12$AOoDJ4Uc3k6x4yPmiw7UR.js4m/lFXCf4FcqFYSq0W547Bjz5klP.',
  'member',
  1
);
