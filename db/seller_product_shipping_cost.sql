-- Per-seller shipping cost on pricelist (alongside unit_price)
-- mysql supe_r_clones_cloud < db/seller_product_shipping_cost.sql

ALTER TABLE seller_product_prices
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12, 2) NULL AFTER unit_price;
