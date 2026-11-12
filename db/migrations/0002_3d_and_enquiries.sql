-- Migration: Add 3D models and color swatches to products, and create enquiries & categories tables

-- Add model_3d_url and colors to products
ALTER TABLE products ADD COLUMN model_3d_url TEXT DEFAULT NULL;
ALTER TABLE products ADD COLUMN colors TEXT NOT NULL DEFAULT '[]';

-- Categories collection
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial categories if empty
INSERT OR IGNORE INTO categories (id, slug, name, description, sort_order) VALUES
  ('cat_audio', 'audio-headphones', 'Audio & headphones', 'Earbuds, wired earphones, Bluetooth headphones, neckbands, and speakers.', 1),
  ('cat_chargers', 'chargers-cables', 'Chargers & cables', 'Fast charging wall adapters, multi-port plugs, Type-C, Lightning, and micro-USB cables.', 2),
  ('cat_adapters', 'adapters-readers-storage', 'Adapters, readers & storage', 'OTG adapters, headphone splitters, flash drives, and micro-SD cards.', 3),
  ('cat_cases', 'cases-screen-protection', 'Cases & screen protection', 'Tempered glass, privacy protectors, shockproof clear cases, and magnetic covers.', 4),
  ('cat_stands', 'stands-mounts', 'Stands & mounts', 'Desk stands, magnetic car mounts, dashboard clips, and foldable portable stands.', 5),
  ('cat_phones', 'phones-devices', 'Phones & devices', 'Featured phones, popular smartphones, and verified pre-owned devices available in Techiman.', 6);

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
