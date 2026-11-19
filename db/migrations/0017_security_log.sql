-- Security log (docs/AUTH_PLAN.md, phase 4): sign-ins, 2FA, roles and admin changes go into the
-- same activity_log as marketplace events, with a category and where the request came from.
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0017_security_log.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0017_security_log.sql

-- 'security' (sign-ins, 2FA, roles, invitations, password resets), 'admin' (staff changes to
-- products, prices, orders, quotes) or 'marketplace' (partner actions and decisions about them).
ALTER TABLE activity_log ADD COLUMN category TEXT NOT NULL DEFAULT 'marketplace';
ALTER TABLE activity_log ADD COLUMN ip TEXT;
ALTER TABLE activity_log ADD COLUMN user_agent TEXT;
CREATE INDEX IF NOT EXISTS idx_activity_category ON activity_log (category, at DESC);
