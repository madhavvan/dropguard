-- DropGuard schema for Aurora DSQL
-- No foreign keys, UUID primary keys, one DDL per transaction.

CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE TABLE IF NOT EXISTS drops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  total_inventory INTEGER NOT NULL DEFAULT 0,
  sold_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'live',
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL,
  region VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL DEFAULT 'safe',
  position INTEGER,
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE TABLE IF NOT EXISTS purchase_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drop_id UUID NOT NULL,
  region VARCHAR(32) NOT NULL,
  mode VARCHAR(16) NOT NULL DEFAULT 'safe',
  outcome VARCHAR(32) NOT NULL,
  retries INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  oversold BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_drops_brand ON drops(brand_id);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_attempts_drop ON purchase_attempts(drop_id);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_orders_drop ON orders(drop_id);
COMMIT;
