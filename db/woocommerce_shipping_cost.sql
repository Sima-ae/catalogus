-- Per-source WooCommerce import shipping cost (EUR)
-- mysql supe_r_clones_cloud < db/woocommerce_shipping_cost.sql

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_shipping_cost DECIMAL(12, 2) NULL
  AFTER woocommerce_price_mode;

-- Default AR Factory sources to €30 (override per source in Admin → Import)
UPDATE import_sources
SET woocommerce_shipping_cost = 30
WHERE woocommerce_store_url LIKE '%arfactorywatch.com%'
  AND (woocommerce_shipping_cost IS NULL OR woocommerce_shipping_cost = 0);
