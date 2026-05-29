-- Brands table + product brand columns for Super Clones
-- Import this in phpMyAdmin / CyberPanel SQL importer into database: supe_r_clones_cloud
-- Safe to run more than once (uses IF NOT EXISTS).

SET NAMES utf8mb4;

USE supe_r_clones_cloud;

CREATE TABLE IF NOT EXISTS brands (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  sort_order INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brands_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand VARCHAR(255) NULL AFTER category_id;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand_id VARCHAR(36) NULL AFTER brand;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_brand_id (brand_id);

CREATE TABLE IF NOT EXISTS brand_categories (
  brand_id VARCHAR(36) NOT NULL,
  category_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (brand_id, category_id),
  KEY idx_brand_categories_category_id (category_id),
  CONSTRAINT fk_brand_categories_brand
    FOREIGN KEY (brand_id) REFERENCES brands(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_brand_categories_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
