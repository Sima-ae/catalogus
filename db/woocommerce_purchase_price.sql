-- WooCommerce purchase-price import mode (run after woocommerce_import.sql)
-- mysql supe_r_clones_cloud < db/woocommerce_purchase_price.sql
--
-- woocommerce_price_mode:
--   storefront (default) — import Woo price as catalog price (stuntxl.com)
--   purchase_price — supplier price → purchase_price, catalog price = 0 (AR Factory)

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_price_mode VARCHAR(32) NOT NULL DEFAULT 'storefront'
  AFTER woocommerce_category_slug;
