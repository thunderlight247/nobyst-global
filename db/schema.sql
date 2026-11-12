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
  model_3d_url TEXT DEFAULT NULL,
  colors TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_sort ON products (sort_order);

-- Categories collection
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Enquiries collection (from Contact, Partner with us, and Bulk order forms)
CREATE TABLE IF NOT EXISTS enquiries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'contact', -- 'contact', 'partnership', 'bulk_order'
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  topic TEXT,
  message TEXT NOT NULL,
  product_name TEXT,
  quantity INTEGER,
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'closed'
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enquiries_type ON enquiries (type);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created ON enquiries (created_at DESC);

-- Existing databases created before multi-image support:
--   ALTER TABLE products ADD COLUMN gallery TEXT NOT NULL DEFAULT '[]';
-- Existing databases created before prices and stock status:
--   ALTER TABLE products ADD COLUMN price_pesewas INTEGER;
--   ALTER TABLE products ADD COLUMN stock_status TEXT NOT NULL DEFAULT 'in_stock';
