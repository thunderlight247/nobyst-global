-- Payment provider per order (Paystack today, Hubtel once the client's keys are added).
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0020_payment_providers.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0020_payment_providers.sql

-- 'paystack' or 'hubtel'. Existing orders were all Paystack.
ALTER TABLE orders ADD COLUMN payment_provider TEXT NOT NULL DEFAULT 'paystack';
-- Hubtel's checkout id from starting the payment; its callback must echo the same id.
ALTER TABLE orders ADD COLUMN provider_checkout_id TEXT;
-- The provider's own transaction / invoice id once paid, for support and refunds.
ALTER TABLE orders ADD COLUMN provider_transaction_id TEXT;
