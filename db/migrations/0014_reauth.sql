-- Re-confirmation before risky admin actions (docs/AUTH_PLAN.md, phase 3).
-- reauth_at is when this session last proved password + 2FA code: at sign-in, or in the
-- "Confirm it's you" dialog. Risky actions need it within the last 15 minutes.
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0014_reauth.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0014_reauth.sql
ALTER TABLE sessions ADD COLUMN reauth_at TEXT;
