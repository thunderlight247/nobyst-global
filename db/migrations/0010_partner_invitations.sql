-- Partner invitations: an admin emails a single-use link; opening it creates (or upgrades) the
-- invitee's account to a partner. Only the SHA-256 hash of each link token is stored.
--
-- Apply after 0009_partners.sql:
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0010_partner_invitations.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0010_partner_invitations.sql

CREATE TABLE IF NOT EXISTS partner_invitations (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,                       -- lower-cased; the account must use this email
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  enquiry_id TEXT REFERENCES enquiries(id) ON DELETE SET NULL,
  invited_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,                  -- ISO timestamp
  accepted_at TEXT,
  accepted_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON partner_invitations (email);

-- Organisation name from the "Partner with us" form (previously folded into phone as "Org: …").
ALTER TABLE enquiries ADD COLUMN company TEXT;
