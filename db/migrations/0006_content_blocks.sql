-- Editable text for pages. A missing key falls back to the default copy in code.
CREATE TABLE IF NOT EXISTS content_blocks (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
