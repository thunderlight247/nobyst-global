-- Product catalogue. Applied locally and remotely with wrangler d1 execute.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  features TEXT NOT NULL DEFAULT '[]',
  image TEXT NOT NULL,
  gallery TEXT NOT NULL DEFAULT '[]',
  -- Price in pesewas; NULL means the price is confirmed on WhatsApp.
  price_pesewas INTEGER,
  stock_status TEXT NOT NULL DEFAULT 'in_stock',
  image_alt TEXT NOT NULL DEFAULT '',
  fits TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_sort ON products (sort_order);

-- Existing databases created before multi-image support:
--   ALTER TABLE products ADD COLUMN gallery TEXT NOT NULL DEFAULT '[]';
-- Existing databases created before prices and stock status:
--   ALTER TABLE products ADD COLUMN price_pesewas INTEGER;
--   ALTER TABLE products ADD COLUMN stock_status TEXT NOT NULL DEFAULT 'in_stock';
