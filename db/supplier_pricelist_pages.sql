-- Multi-supplier pricelist pages (run once on existing database).
-- Fresh installs: use db/catalogus_full_schema.sql which includes these changes.

USE supe_r_clones_cloud;

CREATE TABLE IF NOT EXISTS pricelist_pages (
  id VARCHAR(36) NOT NULL,
  slug VARCHAR(64) NOT NULL,
  label VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pricelist_pages_slug (slug),
  KEY idx_pricelist_pages_active_sort (active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO pricelist_pages (id, slug, label, sort_order, active)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'platform',
  'Platform pricelist',
  0,
  1
)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  active = VALUES(active);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS supplier_pricelist_id VARCHAR(36) NULL AFTER sold_out;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_supplier_pricelist (supplier_pricelist_id);

-- Scope seller prices per pricelist page
ALTER TABLE seller_product_prices
  ADD COLUMN IF NOT EXISTS list_owner_id VARCHAR(36) NULL AFTER product_id;

UPDATE seller_product_prices spp
INNER JOIN pricelist_items pi
  ON pi.product_id = spp.product_id
  AND pi.owner_user_id = '00000000-0000-4000-8000-000000000001'
SET spp.list_owner_id = pi.owner_user_id
WHERE spp.list_owner_id IS NULL;

UPDATE seller_product_prices
SET list_owner_id = '00000000-0000-4000-8000-000000000001'
WHERE list_owner_id IS NULL;

ALTER TABLE seller_product_prices
  MODIFY list_owner_id VARCHAR(36) NOT NULL;

ALTER TABLE seller_product_prices
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (list_owner_id, seller_id, product_id);

ALTER TABLE seller_product_prices
  ADD KEY IF NOT EXISTS idx_seller_prices_list_product (list_owner_id, product_id);

UPDATE products p
INNER JOIN pricelist_items pi
  ON pi.product_id = p.id
  AND pi.owner_user_id IN (SELECT id FROM pricelist_pages WHERE active = 1)
SET p.supplier_pricelist_id = pi.owner_user_id
WHERE p.supplier_pricelist_id IS NULL;
