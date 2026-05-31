-- Brand subcategories (e.g. MEN, WOMEN under a brand)
-- mysql supe_r_clones_cloud < db/brand_subcategories.sql

USE supe_r_clones_cloud;

CREATE TABLE IF NOT EXISTS brand_subcategories (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  brand_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  sort_order INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_brand_subcategory_slug (brand_id, slug),
  KEY idx_brand_subcategories_brand_id (brand_id),
  CONSTRAINT fk_brand_subcategories_brand
    FOREIGN KEY (brand_id) REFERENCES brands(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_subcategory VARCHAR(255) NULL AFTER brand_id;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_subcategory_id VARCHAR(36) NULL AFTER brand_subcategory;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_brand_subcategory_id (brand_subcategory_id);
