-- Partner portal: partner accounts, partner-owned requests and wholesale prices.
--
-- Apply after 0008_security.sql:
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0009_partners.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0009_partners.sql
--
-- users.role now takes 'customer' | 'partner' | 'admin'. Admins change it in /admin → Users.

-- Business name shown in the partner portal and on partner requests.
ALTER TABLE users ADD COLUMN company TEXT;

-- The partner account that sent a request through the portal. Public-form enquiries stay NULL,
-- so a partner only ever sees requests they sent while signed in, never matched by email.
ALTER TABLE enquiries ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_enquiries_user ON enquiries (user_id);

-- Wholesale prices live apart from products so public pages, which read products, can never
-- leak them. Only the partner portal and the admin read this table.
CREATE TABLE IF NOT EXISTS wholesale_prices (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  price_pesewas INTEGER NOT NULL,
  min_quantity INTEGER NOT NULL DEFAULT 5,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
