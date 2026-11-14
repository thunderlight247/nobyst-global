-- Customer accounts stored in D1. Passwords are hashed with PBKDF2 in the app;
-- raw session and reset tokens are never stored, only their SHA-256 hashes.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,                -- stored lower-cased
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,               -- "pbkdf2$<iterations>$<salt b64>$<hash b64>"
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);

ALTER TABLE orders ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
