-- WooCommerce import sources (run on VPS after yupoo_import.sql)
-- mysql supe_r_clones_cloud < db/woocommerce_import.sql

USE supe_r_clones_cloud;

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) NOT NULL DEFAULT 'yupoo' AFTER name;

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_store_url TEXT NULL AFTER yupoo_access_password;

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_category_slug VARCHAR(128) NULL AFTER woocommerce_store_url;

-- Allow WooCommerce sources without a Yupoo URL
ALTER TABLE import_sources
  MODIFY COLUMN yupoo_category_url TEXT NULL;
