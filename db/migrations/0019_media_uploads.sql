-- Private register of uploaded files. Public links use random names (/api/media/m/<random>.jpg)
-- that say nothing about the file or who uploaded it; only admins see this register.
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0019_media_uploads.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0019_media_uploads.sql
CREATE TABLE IF NOT EXISTS media_uploads (
  key TEXT PRIMARY KEY,                 -- R2 object key, e.g. m/3f2a…c9.jpg
  original_name TEXT NOT NULL,          -- the file name on the uploader's device
  uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  uploader_email TEXT,
  uploader_role TEXT,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,          -- after cleaning
  original_size_bytes INTEGER NOT NULL, -- as uploaded
  width INTEGER,
  height INTEGER,
  sha256 TEXT NOT NULL,                 -- fingerprint of the stored file
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_media_uploader ON media_uploads (uploader_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_created ON media_uploads (created_at DESC);
