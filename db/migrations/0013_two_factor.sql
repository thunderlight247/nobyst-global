-- Two-step sign-in with an authenticator app (TOTP, RFC 6238). Required for admins and owners,
-- optional for partners and customers. See docs/AUTH_PLAN.md, phase 2.
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0013_two_factor.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0013_two_factor.sql
--
-- Needs the worker secret TOTP_ENCRYPTION_KEY (32 random bytes, base64) before deploying.

-- One row per account that has started or finished setting up an authenticator.
-- secret_ciphertext is AES-GCM encrypted with TOTP_ENCRYPTION_KEY, so a copy of the database alone
-- cannot generate codes. enabled_at is NULL until the first code is confirmed.
-- last_used_step is the last accepted 30-second step, so a code cannot be used twice.
CREATE TABLE IF NOT EXISTS user_totp (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_ciphertext TEXT NOT NULL,
  enabled_at TEXT,
  last_used_step INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single-use backup codes, stored only as SHA-256 hashes.
CREATE TABLE IF NOT EXISTS recovery_codes (
  code_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user ON recovery_codes (user_id);

-- When this session passed the second step. A session of an account with 2FA turned on reaches
-- nothing but the code page until this is set.
ALTER TABLE sessions ADD COLUMN mfa_verified_at TEXT;
