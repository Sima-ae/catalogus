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
