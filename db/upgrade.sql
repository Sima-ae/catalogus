-- Run once on an existing database (after an older schema import).
-- Fresh installs: use db/catalogus_full_schema.sql (recommended) or the legacy
-- supe_r_clones_cloud_init.sql + supe_r_clones_cloud_users.sql pair.

USE supe_r_clones_cloud;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS badge_rating TINYINT UNSIGNED NULL DEFAULT NULL AFTER is_super_admin;

INSERT INTO settings (id, `key`, value, description)
VALUES
  (UUID(), 'site_name', 'Super Clones', 'Store display name'),
  (UUID(), 'site_tagline', '', 'Store tagline (empty = localized Catalog 2026)'),
  (UUID(), 'support_email', '', 'Support contact email'),
  (UUID(), 'currency', 'EUR', 'Checkout currency code'),
  (UUID(), 'tax_rate', '0', 'Tax rate percentage'),
  (UUID(), 'catalog_mode', 'false', 'Browse-only storefront when true'),
  (UUID(), 'product_card_show_details', 'true', 'Show price and short description on shop product cards')
ON DUPLICATE KEY UPDATE
  description = COALESCE(NULLIF(VALUES(description), ''), description),
  updated_at = CURRENT_TIMESTAMP;

-- Use localized tagline (Catalog 2026 / Catalogus 2026, etc.) — do not keep the old English-only default
UPDATE settings
SET value = ''
WHERE `key` = 'site_tagline'
  AND LOWER(TRIM(value)) IN (
    'digital marketplace for templates and digital assets',
    'catalog 2026'
  );

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

-- Catalog list performance: active products sorted/filtered by status + created_at
ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_status_created (status, created_at);

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_status_category (status, category_id);

-- Localized category labels (auto-generated when categories are created/updated)
CREATE TABLE IF NOT EXISTS category_translations (
  category_id VARCHAR(36) NOT NULL,
  locale VARCHAR(8) NOT NULL,
  label VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (category_id, locale),
  KEY idx_category_translations_locale (locale),
  CONSTRAINT fk_category_translations_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Yupoo homepage/category access password (encrypted supplier catalogs)
ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS yupoo_access_password VARCHAR(255) NULL
  AFTER yupoo_category_url;

-- Pricelist: mark seller price as out of stock (no numeric price shown)
ALTER TABLE seller_product_prices
  ADD COLUMN IF NOT EXISTS out_of_stock TINYINT(1) NOT NULL DEFAULT 0 AFTER locked;

ALTER TABLE seller_product_prices
  ADD COLUMN IF NOT EXISTS stock_status VARCHAR(16) NULL AFTER out_of_stock;

UPDATE seller_product_prices
SET stock_status = 'out'
WHERE out_of_stock = 1 AND (stock_status IS NULL OR stock_status = '');

-- Rows with a real price must not keep legacy out-of-stock flags (restores pricelist display)
UPDATE seller_product_prices
SET out_of_stock = 0, stock_status = NULL
WHERE unit_price > 0 AND (out_of_stock = 1 OR stock_status IS NOT NULL);

-- Remove legacy "YUPOO" segments from product SKUs (e.g. LOUIS-VUITTON-YUPOO-63229531 → LOUIS-VUITTON-63229531)
UPDATE products
SET sku = LEFT(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(sku, '(?i)yupoo', ''),
      '[ _-]+',
      '-'
    ),
    '(^-+|-+$)',
    ''
  ),
  255
)
WHERE sku REGEXP '(?i)yupoo';

UPDATE products
SET sku = CONCAT('LEGACY-', LEFT(id, 8))
WHERE sku IS NULL OR TRIM(sku) = '';

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
SET p.sku = CONCAT(LEFT(TRIM(p.sku), 246), '-', LEFT(p.id, 8));

-- Default empty product version to Super Clones (shop displays "Versie: Super Clones")
UPDATE products
SET version = 'Super Clones'
WHERE version IS NULL
   OR TRIM(version) = ''
   OR TRIM(version) IN ('—', '-');

-- Remove ALL brand-name prefixes from SKUs (any brand slug in SKU, not only assigned brand).
-- Required on production: npx tsx scripts/remove-brand-from-skus.ts
-- (SQL-only updates miss mismatched rows, e.g. LOUIS-VUITTON-… with brand GUCCI.)

-- Localized product tag labels (auto-generated when products are saved)
CREATE TABLE IF NOT EXISTS tag_translations (
  tag_name VARCHAR(191) NOT NULL,
  locale VARCHAR(8) NOT NULL,
  label VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tag_name, locale),
  KEY idx_tag_translations_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill tag translations for existing products:
--   npx tsx scripts/sync-tag-translations.ts

-- Detach qualified sibling categories (e.g. KIDS SLIPPERS, KIDS SHOES) wrongly nested under SLIPPERS / SHOES.
-- They are separate top-level categories, not subcategories of the shorter name.
UPDATE categories child
INNER JOIN categories parent ON parent.id = child.parent_id
  AND parent.active = 1
  AND child.active = 1
SET child.parent_id = NULL
WHERE LOWER(TRIM(child.name)) LIKE CONCAT('% ', LOWER(TRIM(parent.name)))
  AND LOWER(TRIM(child.name)) <> LOWER(TRIM(parent.name));

-- Backfill unambiguous category labels (SOCCER › SHOES vs bare SHOES):
--   npm run db:fix-product-categories

-- KIDS › SHOES subcategory (shop pills under KINDEREN): create + migrate products
--   npm run db:ensure-kids-shoes
SET @kids_parent_id := (
  SELECT id FROM categories
  WHERE active = 1 AND LOWER(TRIM(name)) = 'kids'
    AND (parent_id IS NULL OR TRIM(parent_id) = '')
  LIMIT 1
);
INSERT INTO categories (id, name, slug, description, parent_id, active)
SELECT UUID(), 'SHOES', 'shoes', NULL, @kids_parent_id, 1
FROM DUAL
WHERE @kids_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.active = 1 AND c.parent_id = @kids_parent_id AND LOWER(TRIM(c.name)) = 'shoes'
  );

-- Manual catalog sort order per shop view (homepage, /new, category, subcategory, brand).
CREATE TABLE IF NOT EXISTS catalog_product_positions (
  scope VARCHAR(128) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  position INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, product_id),
  KEY idx_catalog_positions_scope_order (scope, position)
);

-- WooCommerce import sources (see db/woocommerce_import.sql)
ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) NOT NULL DEFAULT 'yupoo' AFTER name;

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_store_url TEXT NULL AFTER yupoo_access_password;

ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_category_slug VARCHAR(128) NULL AFTER woocommerce_store_url;

ALTER TABLE import_sources
  MODIFY COLUMN yupoo_category_url TEXT NULL;

-- Facebook post import (see db/facebook_import.sql)
-- source_type = 'facebook' — no extra columns required

-- Lkxox Zen Cart import (see db/lkxox_import.sql)
ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS catalog_list_url TEXT NULL AFTER woocommerce_category_slug;

-- WeCatalog import (see db/wecatalog_import.sql)
-- source_type = 'wecatalog' — catalog_list_url holds category list URL with groupId

-- WooCommerce purchase-price mode (see db/woocommerce_purchase_price.sql)
ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_price_mode VARCHAR(32) NOT NULL DEFAULT 'storefront'
  AFTER woocommerce_category_slug;

-- Internal cost / purchase price (admin only — not shown on storefront)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(12, 2) NULL AFTER original_price;

-- Shipping costs (admin / pricelist — not shown on storefront)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12, 2) NULL AFTER purchase_price;

-- WooCommerce per-source import shipping cost (see db/woocommerce_shipping_cost.sql)
ALTER TABLE import_sources
  ADD COLUMN IF NOT EXISTS woocommerce_shipping_cost DECIMAL(12, 2) NULL
  AFTER woocommerce_price_mode;

-- Per-seller pricelist shipping cost (see db/seller_product_shipping_cost.sql)
ALTER TABLE seller_product_prices
  ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(12, 2) NULL AFTER unit_price;

-- Sold-out ribbon on shop product cards and product page gallery
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sold_out TINYINT(1) NOT NULL DEFAULT 0 AFTER featured;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS pre_order TINYINT(1) NOT NULL DEFAULT 0 AFTER sold_out;

-- Product variant options (Mechanism tiers, etc.) — see db/product_options.sql

-- Yupoo album datePublished (shown on Yupoo under each album title)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_album_date DATE NULL AFTER source_album_id;

ALTER TABLE products
  ADD INDEX IF NOT EXISTS idx_products_source_album_date (source_album_date);
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_options LONGTEXT NULL AFTER available_colors;

-- ---------------------------------------------------------------------------
-- Live chat + quote requests (self-hosted)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_participant_sessions (
  id VARCHAR(36) NOT NULL,
  participant_type VARCHAR(32) NOT NULL,
  site_access_code_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NULL,
  pricelist_owner_id VARCHAR(36) NULL,
  display_label VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_chat_sessions_user (user_id),
  KEY idx_chat_sessions_code (site_access_code_id),
  KEY idx_chat_sessions_pricelist_owner (pricelist_owner_id),
  CONSTRAINT fk_chat_sessions_code
    FOREIGN KEY (site_access_code_id) REFERENCES site_access_codes(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_chat_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_conversations (
  id VARCHAR(36) NOT NULL,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  buyer_session_id VARCHAR(36) NULL,
  supplier_session_id VARCHAR(36) NULL,
  assigned_admin_user_id VARCHAR(36) NULL,
  pricelist_owner_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_conv_type_status (type, status),
  KEY idx_chat_conv_buyer (buyer_session_id),
  KEY idx_chat_conv_supplier (supplier_session_id),
  KEY idx_chat_conv_admin (assigned_admin_user_id),
  KEY idx_chat_conv_updated (updated_at),
  CONSTRAINT fk_chat_conv_buyer
    FOREIGN KEY (buyer_session_id) REFERENCES chat_participant_sessions(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_chat_conv_supplier
    FOREIGN KEY (supplier_session_id) REFERENCES chat_participant_sessions(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_chat_conv_admin
    FOREIGN KEY (assigned_admin_user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
  id VARCHAR(36) NOT NULL,
  conversation_id VARCHAR(36) NOT NULL,
  sender_session_id VARCHAR(36) NOT NULL,
  sender_role VARCHAR(16) NOT NULL,
  message_type VARCHAR(16) NOT NULL DEFAULT 'text',
  body TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  PRIMARY KEY (id),
  KEY idx_chat_messages_conv_created (conversation_id, created_at),
  KEY idx_chat_messages_sender (sender_session_id),
  CONSTRAINT fk_chat_msg_conversation
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_msg_sender
    FOREIGN KEY (sender_session_id) REFERENCES chat_participant_sessions(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_quote_requests (
  id VARCHAR(36) NOT NULL,
  conversation_id VARCHAR(36) NOT NULL,
  message_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(255) NULL,
  product_image_url TEXT NULL,
  product_brand VARCHAR(255) NULL,
  product_category VARCHAR(255) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  site_access_code_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NULL,
  supplier_conversation_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_quotes_conv (conversation_id, created_at),
  KEY idx_chat_quotes_status (status, updated_at),
  KEY idx_chat_quotes_code (site_access_code_id),
  KEY idx_chat_quotes_user (user_id),
  KEY idx_chat_quotes_supplier_conv (supplier_conversation_id),
  CONSTRAINT fk_chat_quotes_conversation
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_quotes_message
    FOREIGN KEY (message_id) REFERENCES chat_messages(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_chat_quotes_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_chat_quotes_code
    FOREIGN KEY (site_access_code_id) REFERENCES site_access_codes(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_chat_quotes_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_chat_quotes_supplier_conv
    FOREIGN KEY (supplier_conversation_id) REFERENCES chat_conversations(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
