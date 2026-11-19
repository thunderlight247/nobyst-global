-- Delivery details, fulfilment tracking and partner quotes on orders.
--
--   npx wrangler d1 execute nobyst-catalog --local  --file=./db/migrations/0011_order_fulfilment.sql
--   npx wrangler d1 execute nobyst-catalog --remote --file=./db/migrations/0011_order_fulfilment.sql

-- 'delivery' | 'pickup' | 'arranged' (partner quotes, delivery agreed directly).
ALTER TABLE orders ADD COLUMN delivery_method TEXT;
ALTER TABLE orders ADD COLUMN delivery_region TEXT;
ALTER TABLE orders ADD COLUMN delivery_town TEXT;
ALTER TABLE orders ADD COLUMN delivery_address TEXT;
ALTER TABLE orders ADD COLUMN delivery_notes TEXT;

-- What the team has done with a paid order: new → processing → dispatched / ready → delivered,
-- or cancelled. Separate from `status`, which only tracks payment.
ALTER TABLE orders ADD COLUMN fulfilment_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE orders ADD COLUMN fulfilment_updated_at TEXT;

-- Partner quotes: the request it answers and the Paystack page the partner pays on.
ALTER TABLE orders ADD COLUMN enquiry_id TEXT REFERENCES enquiries(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN payment_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_enquiry ON orders (enquiry_id);
