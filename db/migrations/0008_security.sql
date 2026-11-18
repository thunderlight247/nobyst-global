-- Admin roles and request rate limiting.
--
-- Apply with:
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0008_security.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0008_security.sql
--
-- Then grant admin to an existing account (sign up on /account first):
--   npx wrangler d1 execute nobyst-catalog --remote \
--     --command "UPDATE users SET role = 'admin' WHERE email = 'you@example.com'"

-- 'customer' (default) or 'admin'. Only admins can open /admin or call /api/admin/*.
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';

-- Fixed-window counters keyed by action + client (IP or email). Rows are pruned as they expire.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_end INTEGER NOT NULL      -- unix epoch milliseconds
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_end);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
