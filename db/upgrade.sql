-- Run once on an existing database (after an older schema import).
-- Fresh installs: use supe_r_clones_cloud_init.sql + supe_r_clones_cloud_users.sql only.

USE supe_r_clones_cloud;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS badge_rating TINYINT UNSIGNED NULL DEFAULT NULL AFTER is_super_admin;

INSERT INTO settings (id, `key`, value, description)
VALUES
  (UUID(), 'site_name', 'Super Clones', 'Store display name'),
  (UUID(), 'site_tagline', 'Digital marketplace for templates and digital assets', 'Store tagline'),
  (UUID(), 'support_email', '', 'Support contact email'),
  (UUID(), 'currency', 'EUR', 'Checkout currency code'),
  (UUID(), 'tax_rate', '0', 'Tax rate percentage'),
  (UUID(), 'catalog_mode', 'false', 'Browse-only storefront when true'),
  (UUID(), 'product_card_show_details', 'true', 'Show price and short description on shop product cards')
ON DUPLICATE KEY UPDATE
  value = IF(VALUES(value) <> '', VALUES(value), value),
  updated_at = CURRENT_TIMESTAMP;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(36) NULL AFTER category;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_category_id (category_id);

-- Link category_id from category name only when the name is unique among active categories.
-- (Avoids mixing top-level SHOES with SOCCER › SHOES.)
UPDATE products p
INNER JOIN categories c ON c.active = 1 AND c.name = p.category
SET p.category_id = c.id
WHERE p.category_id IS NULL
  AND TRIM(IFNULL(p.category, '')) <> ''
  AND (
    SELECT COUNT(*) FROM categories c2 WHERE c2.active = 1 AND c2.name = p.category
  ) = 1;

-- Keep category label in sync when category_id is already set.
UPDATE products p
INNER JOIN categories c ON c.id = p.category_id AND c.active = 1
SET p.category = c.name
WHERE p.category IS NULL OR p.category <> c.name;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compatibility TEXT NULL AFTER requirements;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS support_url TEXT NULL AFTER documentation_url;

UPDATE users
SET
  email = 'info@superclones.cloud',
  role = 'admin',
  is_super_admin = 1,
  name = COALESCE(NULLIF(TRIM(name), ''), 'Super Admin')
WHERE LOWER(email) = 'info@000.it.com';

INSERT INTO users (id, email, password_hash, role, is_super_admin, name)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  'info@superclones.cloud',
  '$2b$12$ue2o4T2MAp5vd92OehduqO4bc4AR0vXSfmwX4Do268K9p5YLOeTjy',
  'admin',
  1,
  'Super Admin'
WHERE NOT EXISTS (
  SELECT 1 FROM users
  WHERE LOWER(email) IN ('info@000.it.com', 'info@superclones.cloud')
);

UPDATE user_profiles
SET
  email = 'info@superclones.cloud',
  name = COALESCE(NULLIF(TRIM(name), ''), 'Super Admin'),
  role = 'admin'
WHERE LOWER(email) = 'info@000.it.com';

-- Required, unique SKUs (case-insensitive via utf8mb4_unicode_ci)
UPDATE products SET sku = NULL WHERE sku IS NOT NULL AND TRIM(sku) = '';

UPDATE products p
INNER JOIN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(sku))
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM products
    WHERE sku IS NOT NULL AND TRIM(sku) <> ''
  ) ranked
  WHERE ranked.rn > 1
) dup ON dup.id = p.id
SET p.sku = CONCAT(TRIM(p.sku), '-', LEFT(p.id, 8));

UPDATE products
SET sku = CONCAT('LEGACY-', LEFT(id, 8))
WHERE sku IS NULL OR TRIM(sku) = '';

ALTER TABLE products
  ADD UNIQUE KEY IF NOT EXISTS uq_products_sku (sku);

ALTER TABLE products
  MODIFY COLUMN sku VARCHAR(255) NOT NULL;

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

INSERT INTO user_profiles (id, email, name, role)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  'info@superclones.cloud',
  'Super Admin',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles
  WHERE id = 'a0000000-0000-0000-0000-000000000001'
     OR LOWER(email) IN ('info@000.it.com', 'info@superclones.cloud')
);

-- Yupoo import: same album/style code may exist per brand (see db/import_brand_dedup.sql)
UPDATE products p
INNER JOIN brands b ON b.active = 1 AND LOWER(TRIM(b.name)) = LOWER(TRIM(p.brand))
SET p.brand_id = b.id
WHERE p.brand_id IS NULL
  AND p.brand IS NOT NULL
  AND TRIM(p.brand) <> '';

ALTER TABLE products DROP INDEX IF EXISTS uq_products_source_album_id;

ALTER TABLE products
  ADD UNIQUE INDEX IF NOT EXISTS uq_products_source_album_brand (source_album_id, brand(64));

-- Brand subcategories (MEN, WOMEN, etc. per brand)
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

-- Pricelist feature
CREATE TABLE IF NOT EXISTS pricelist_items (
  id VARCHAR(36) NOT NULL,
  owner_user_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  added_by_user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pricelist_owner_product (owner_user_id, product_id),
  KEY idx_pricelist_owner (owner_user_id),
  KEY idx_pricelist_product (product_id),
  CONSTRAINT fk_pricelist_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_product_prices (
  seller_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(36) NULL,
  PRIMARY KEY (seller_id, product_id),
  KEY idx_seller_prices_product (product_id),
  CONSTRAINT fk_seller_prices_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_pricelist_access (
  id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  list_owner_id VARCHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  approved_by VARCHAR(36) NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seller_list_owner (seller_id, list_owner_id),
  KEY idx_spa_list_owner (list_owner_id),
  KEY idx_spa_seller (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Storefront currency: euro everywhere (was USD in older installs)
UPDATE settings SET value = 'EUR' WHERE `key` = 'currency';

CREATE TABLE IF NOT EXISTS pricelist_share_settings (
  list_owner_id VARCHAR(36) NOT NULL,
  password_hash VARCHAR(255) NULL,
  version INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (list_owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One-time fix: products were linked to top-level SHOES vs SOCCER › SHOES (same name).
SET @shoes_soccer_swap_done := (
  SELECT value FROM settings WHERE `key` = 'migration_shoes_soccer_swapped' LIMIT 1
);
SET @top_shoes_id := (
  SELECT id FROM categories WHERE active = 1 AND name = 'SHOES' AND parent_id IS NULL LIMIT 1
);
SET @soccer_shoes_id := (
  SELECT c.id
  FROM categories c
  INNER JOIN categories parent ON parent.id = c.parent_id
    AND parent.active = 1
    AND parent.name = 'SOCCER'
    AND parent.parent_id IS NULL
  WHERE c.active = 1 AND c.name = 'SHOES'
  LIMIT 1
);

UPDATE products
SET category_id = IF(category_id = @top_shoes_id, @soccer_shoes_id, @top_shoes_id)
WHERE IFNULL(@shoes_soccer_swap_done, '') <> '1'
  AND @top_shoes_id IS NOT NULL
  AND @soccer_shoes_id IS NOT NULL
  AND @top_shoes_id <> @soccer_shoes_id
  AND category_id IN (@top_shoes_id, @soccer_shoes_id);

UPDATE import_sources
SET catalog_category_id = IF(
  catalog_category_id = @top_shoes_id,
  @soccer_shoes_id,
  @top_shoes_id
)
WHERE IFNULL(@shoes_soccer_swap_done, '') <> '1'
  AND @top_shoes_id IS NOT NULL
  AND @soccer_shoes_id IS NOT NULL
  AND @top_shoes_id <> @soccer_shoes_id
  AND catalog_category_id IN (@top_shoes_id, @soccer_shoes_id);

INSERT INTO settings (id, `key`, value, description)
SELECT
  UUID(),
  'migration_shoes_soccer_swapped',
  '1',
  'Swapped product assignments between top-level SHOES and SOCCER › SHOES'
FROM DUAL
WHERE IFNULL(@shoes_soccer_swap_done, '') <> '1'
  AND @top_shoes_id IS NOT NULL
  AND @soccer_shoes_id IS NOT NULL
  AND @top_shoes_id <> @soccer_shoes_id
  AND NOT EXISTS (
    SELECT 1 FROM settings WHERE `key` = 'migration_shoes_soccer_swapped'
  );

-- Seller prices: lock after first save; super admin approves edit requests.
ALTER TABLE seller_product_prices
  ADD COLUMN IF NOT EXISTS locked TINYINT(1) NOT NULL DEFAULT 0 AFTER updated_by;

UPDATE seller_product_prices spp
INNER JOIN users u ON u.id = spp.seller_id AND u.role = 'seller'
SET spp.locked = 1
WHERE spp.locked = 0;

CREATE TABLE IF NOT EXISTS seller_price_edit_requests (
  id VARCHAR(36) NOT NULL,
  seller_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  list_owner_id VARCHAR(36) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by VARCHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_sper_list (list_owner_id, status),
  KEY idx_sper_seller_product (seller_id, product_id),
  CONSTRAINT fk_sper_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Personal site-access codes (seed: npm run db:seed-site-access-codes)
CREATE TABLE IF NOT EXISTS site_access_codes (
  id VARCHAR(36) NOT NULL,
  code VARCHAR(16) NOT NULL,
  user_id VARCHAR(36) NULL,
  assigned_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_access_codes_code (code),
  UNIQUE KEY uq_site_access_codes_user (user_id),
  CONSTRAINT fk_sac_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
