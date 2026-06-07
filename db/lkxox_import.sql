-- Lkxox Zen Cart import sources (run after yupoo_import.sql / woocommerce_import.sql)
-- mysql supe_r_clones_cloud < db/lkxox_import.sql

USE supe_r_clones_cloud;

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS catalog_list_url TEXT NULL AFTER woocommerce_category_slug;

-- source_type = 'lkxox' — catalog_list_url holds paginated listing URL
