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
  (UUID(), 'catalog_mode', 'false', 'Browse-only storefront when true')
ON DUPLICATE KEY UPDATE
  value = IF(VALUES(value) <> '', VALUES(value), value),
  updated_at = CURRENT_TIMESTAMP;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(36) NULL AFTER category;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_category_id (category_id);

UPDATE products p
INNER JOIN categories c ON c.active = 1 AND c.name = p.category
SET p.category_id = c.id
WHERE p.category_id IS NULL OR p.category_id <> c.id;

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
