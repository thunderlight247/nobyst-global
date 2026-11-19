-- Automatic invitations from the "Partner with us" form, and partner trust levels.
-- See docs/MARKETPLACE_PLAN.md.
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0015_partner_applications.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0015_partner_applications.sql

-- 'application' when the invitation was sent automatically from the partner form, 'admin' when an
-- admin sent it. trusted = 1 makes the partner trusted as soon as they accept.
ALTER TABLE partner_invitations ADD COLUMN source TEXT NOT NULL DEFAULT 'admin';
ALTER TABLE partner_invitations ADD COLUMN trusted INTEGER NOT NULL DEFAULT 0;

-- For partner accounts: 'pending' (products wait for approval, no wholesale prices), 'trusted'
-- (changes go live instantly) or 'suspended' (products hidden, no partner access).
-- Existing partners were all invited by an admin, so they start trusted.
ALTER TABLE users ADD COLUMN partner_status TEXT;
UPDATE users SET partner_status = 'trusted' WHERE role = 'partner';
