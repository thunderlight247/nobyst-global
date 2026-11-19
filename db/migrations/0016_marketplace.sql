-- Marketplace: partners sell their own products on nobyst.com. See docs/MARKETPLACE_PLAN.md.
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0016_marketplace.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0016_marketplace.sql

-- Who sells the product (NULL = NOBYST itself) and whether it shows in the shop:
-- 'live' (in the shop), 'pending' (waiting for admin approval), 'rejected' (admin declined, see
-- review_note) or 'hidden' (taken down by the partner or an admin). Existing products stay live.
ALTER TABLE products ADD COLUMN partner_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN status TEXT NOT NULL DEFAULT 'live';
ALTER TABLE products ADD COLUMN review_note TEXT;
CREATE INDEX IF NOT EXISTS idx_products_partner ON products (partner_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products (status);

-- NOBYST's commission on a partner's sales, in basis points (1000 = 10%), and where to pay them.
ALTER TABLE users ADD COLUMN commission_bps INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE users ADD COLUMN payout_details TEXT;

-- Each order line remembers its seller and the commission rate at the time of sale, and the
-- partner tracks delivery of their own lines.
ALTER TABLE order_items ADD COLUMN partner_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN commission_bps INTEGER;
ALTER TABLE order_items ADD COLUMN fulfilment_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE order_items ADD COLUMN fulfilment_updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_order_items_partner ON order_items (partner_id);

-- New categories partners ask for; an admin approves (creating the category) or declines.
CREATE TABLE IF NOT EXISTS category_requests (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'approved' | 'declined'
  decided_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);

-- Money NOBYST has paid a partner (recorded by an admin after paying by mobile money or bank).
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_pesewas INTEGER NOT NULL,
  method TEXT NOT NULL,
  reference TEXT,
  note TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payouts_partner ON payouts (partner_id);

-- Who did what: every partner change and every admin decision about partners.
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (datetime('now')),
  actor_id TEXT,
  actor_email TEXT,
  actor_role TEXT,
  partner_id TEXT,              -- the partner the entry is about, for filtering
  action TEXT NOT NULL,         -- e.g. 'product.create', 'product.approve', 'category.request'
  entity_id TEXT,
  summary TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_at ON activity_log (at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_partner ON activity_log (partner_id, at DESC);
