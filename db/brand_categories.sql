-- Link brands to categories (many-to-many: one brand → many categories, one category → many brands)
-- Import into database: supe_r_clones_cloud (after brands.sql)

SET NAMES utf8mb4;

USE supe_r_clones_cloud;

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
