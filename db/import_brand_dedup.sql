-- Allow the same Yupoo album under different brands (e.g. style 1612220 for Burberry and YSL).
-- Run once on VPS: mysql supe_r_clones_cloud < db/import_brand_dedup.sql

USE supe_r_clones_cloud;

UPDATE products p
INNER JOIN brands b ON b.active = 1 AND LOWER(TRIM(b.name)) = LOWER(TRIM(p.brand))
SET p.brand_id = b.id
WHERE p.brand_id IS NULL
  AND p.brand IS NOT NULL
  AND TRIM(p.brand) <> '';

ALTER TABLE products DROP INDEX IF EXISTS uq_products_source_album_id;

ALTER TABLE products
  ADD UNIQUE INDEX IF NOT EXISTS uq_products_source_album_brand (source_album_id, brand(64));
