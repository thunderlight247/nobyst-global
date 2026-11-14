-- Optional parent for one level of sub-categories. NULL means a top-level category.
-- Products keep storing the category name, so existing product rows are unaffected.
ALTER TABLE categories ADD COLUMN parent_id TEXT DEFAULT NULL REFERENCES categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
