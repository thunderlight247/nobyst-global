-- Orders paid through Paystack. Prices are always read from the products table
-- at checkout time; the browser only supplies product slugs, colours and quantities.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,            -- Paystack transaction reference
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'paid' | 'failed'
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  total_pesewas INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GHS',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_pesewas INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_reference ON orders(reference);
