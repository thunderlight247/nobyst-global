-- Email verification for new accounts, and account self-service (docs/SECURITY.md).
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0018_email_verification.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0018_email_verification.sql

-- When the account proved it owns its email (clicked the link, used a password-reset link, or
-- accepted a partner invitation). Customers must confirm before they can pay.
ALTER TABLE users ADD COLUMN email_verified_at TEXT;

-- Staff and partners have already proven their address (invitation link, or set up by an owner).
UPDATE users SET email_verified_at = datetime('now') WHERE role IN ('owner', 'admin', 'partner');

-- Single-use "confirm your email" links; only the SHA-256 of each token is stored.
CREATE TABLE IF NOT EXISTS email_verifications (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications (user_id);
