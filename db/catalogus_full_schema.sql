-- Catalogus — full database schema (empty catalog)
--
-- Use this to provision a fresh MariaDB/MySQL database for cloning the app
-- WITHOUT products, brands, categories, orders, or import history.
--
-- Import (phpMyAdmin, Adminer, mysql CLI, etc.):
--   mysql -u USER -p NEW_DATABASE < db/catalogus_full_schema.sql
--
-- Or create the database first, then import into it (edit DATABASE name below if needed).
--
-- Includes:
--   • All tables, columns, indexes, and foreign keys (current app version)
--   • Default settings (store name, currency, site access, etc.)
--   • Default admin / test users (change passwords after import!)
--
-- Does NOT include:
--   • Products, brands, categories, pricelist rows, orders, import jobs, etc.
--
-- After import (optional):
--   npm run db:seed-site-access-codes   — personal buyer access codes
--   npm run db:reset-admin-password     — set a new super-admin password
--
-- For upgrading an OLD database instead, use db/upgrade.sql on the existing DB.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS supe_r_clones_cloud
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE supe_r_clones_cloud;

-- ---------------------------------------------------------------------------
-- Core catalog structure
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT NULL,
  image_url TEXT NULL,
  parent_id VARCHAR(36) NULL,
  sort_order INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_parent_id (parent_id),
  CONSTRAINT fk_categories_parent
    FOREIGN KEY (parent_id) REFERENCES categories(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS brand_subcategories (
  id VARCHAR(36) NOT NULL,
  brand_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  sort_order INT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brand_subcategory_slug (brand_id, slug),
  KEY idx_brand_subcategories_brand_id (brand_id),
  CONSTRAINT fk_brand_subcategories_brand
    FOREIGN KEY (brand_id) REFERENCES brands(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT NULL,
  price DECIMAL(12,2) NOT NULL,
  original_price DECIMAL(12,2) NULL,
  purchase_price DECIMAL(12,2) NULL,
  shipping_cost DECIMAL(12,2) NULL,
  image_url TEXT NOT NULL,
  gallery_images LONGTEXT NULL,
  available_sizes VARCHAR(512) NULL,
  available_colors VARCHAR(512) NULL,
  product_options LONGTEXT NULL,
  source_url TEXT NULL,
  source_album_id VARCHAR(64) NULL,
  category VARCHAR(255) NOT NULL,
  category_id VARCHAR(36) NULL,
  brand VARCHAR(255) NULL,
  brand_id VARCHAR(36) NULL,
  brand_subcategory VARCHAR(255) NULL,
  brand_subcategory_id VARCHAR(36) NULL,
  tags LONGTEXT NULL,
  author_id VARCHAR(36) NULL,
  author VARCHAR(255) NOT NULL,
  author_icon VARCHAR(64) NOT NULL,
  sku VARCHAR(255) NOT NULL,
  download_url TEXT NULL,
  demo_url TEXT NULL,
  documentation_url TEXT NULL,
  support_url TEXT NULL,
  version VARCHAR(64) NULL,
  license_type VARCHAR(255) NULL,
  file_size VARCHAR(255) NULL,
  requirements LONGTEXT NULL,
  features LONGTEXT NULL,
  compatibility TEXT NULL,
  changelog TEXT NULL,
  rating DECIMAL(3,2) NULL,
  review_count INT NULL,
  download_count INT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  sold_out TINYINT(1) NOT NULL DEFAULT 0,
  pre_order TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_sku (sku),
  UNIQUE KEY uq_products_source_album_brand (source_album_id, brand(64)),
  KEY idx_products_category_id (category_id),
  KEY idx_products_brand_id (brand_id),
  KEY idx_products_brand_subcategory_id (brand_subcategory_id),
  KEY idx_products_status_created (status, created_at),
  KEY idx_products_status_category (status, category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS tag_translations (
  tag_name VARCHAR(191) NOT NULL,
  locale VARCHAR(8) NOT NULL,
  label VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tag_name, locale),
  KEY idx_tag_translations_locale (locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_product_positions (
  scope VARCHAR(128) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  position INT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, product_id),
  KEY idx_catalog_positions_scope_order (scope, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Users & authentication
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'buyer',
  is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
  badge_rating TINYINT UNSIGNED NULL DEFAULT NULL,
  name VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR(36) NOT NULL,
  email VARCHAR(320) NULL,
  name VARCHAR(255) NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'buyer',
  avatar_url TEXT NULL,
  bio TEXT NULL,
  website TEXT NULL,
  location VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_profiles_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ---------------------------------------------------------------------------
-- Import pipeline (Yupoo, WooCommerce, Facebook, Lkxox)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS import_sources (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  source_type VARCHAR(32) NOT NULL DEFAULT 'yupoo',
  yupoo_category_url TEXT NULL,
  yupoo_access_password VARCHAR(255) NULL,
  woocommerce_store_url TEXT NULL,
  woocommerce_category_slug VARCHAR(128) NULL,
  woocommerce_price_mode VARCHAR(32) NOT NULL DEFAULT 'storefront',
  woocommerce_shipping_cost DECIMAL(12,2) NULL,
  catalog_list_url TEXT NULL,
  catalog_category_id VARCHAR(36) NULL,
  catalog_brand_id VARCHAR(36) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_import_sources_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_jobs (
  id VARCHAR(36) NOT NULL,
  source_id VARCHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'queued',
  total_albums INT NOT NULL DEFAULT 0,
  processed INT NOT NULL DEFAULT 0,
  imported INT NOT NULL DEFAULT 0,
  skipped INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  error_log TEXT NULL,
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_import_jobs_source (source_id),
  KEY idx_import_jobs_status (status),
  CONSTRAINT fk_import_jobs_source
    FOREIGN KEY (source_id) REFERENCES import_sources(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_job_items (
  id VARCHAR(36) NOT NULL,
  job_id VARCHAR(36) NOT NULL,
  album_url TEXT NOT NULL,
  album_id VARCHAR(64) NOT NULL,
  album_title VARCHAR(128) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  raw_json LONGTEXT NULL,
  error_message TEXT NULL,
  product_id VARCHAR(36) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_import_job_items_job (job_id),
  KEY idx_import_job_items_status (status),
  KEY idx_import_job_items_album (album_id),
  CONSTRAINT fk_import_job_items_job
    FOREIGN KEY (job_id) REFERENCES import_jobs(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Pricelist
-- ---------------------------------------------------------------------------

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
  unit_price DECIMAL(12,2) NOT NULL,
  shipping_cost DECIMAL(12,2) NULL,
  currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by VARCHAR(36) NULL,
  locked TINYINT(1) NOT NULL DEFAULT 0,
  out_of_stock TINYINT(1) NOT NULL DEFAULT 0,
  stock_status VARCHAR(16) NULL,
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

CREATE TABLE IF NOT EXISTS pricelist_share_settings (
  list_owner_id VARCHAR(36) NOT NULL,
  password_hash VARCHAR(255) NULL,
  version INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (list_owner_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ---------------------------------------------------------------------------
-- Commerce (orders, cart, reviews, wishlist, downloads)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) NOT NULL,
  order_number VARCHAR(255) NULL,
  customer_id VARCHAR(36) NULL,
  customer_email VARCHAR(320) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(64) NULL,
  billing_address LONGTEXT NULL,
  shipping_address LONGTEXT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NULL,
  shipping_amount DECIMAL(12,2) NULL,
  discount_amount DECIMAL(12,2) NULL,
  total DECIMAL(12,2) NOT NULL,
  currency VARCHAR(8) NULL DEFAULT 'EUR',
  payment_method VARCHAR(64) NULL,
  payment_status VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  tracking_number VARCHAR(255) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_orders_customer_id (customer_id),
  KEY idx_orders_created_at (created_at),
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES user_profiles(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NULL,
  product_name VARCHAR(255) NOT NULL,
  product_sku VARCHAR(255) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  license_type VARCHAR(255) NULL,
  download_url TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_items_order_id (order_id),
  KEY idx_order_items_product_id (product_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  session_id VARCHAR(255) NULL,
  product_id VARCHAR(36) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  license_type VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cart_items_user_id (user_id),
  KEY idx_cart_items_session_id (session_id),
  KEY idx_cart_items_product_id (product_id),
  CONSTRAINT fk_cart_items_user
    FOREIGN KEY (user_id) REFERENCES user_profiles(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_cart_items_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
  id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  user_name VARCHAR(255) NOT NULL,
  rating INT NOT NULL,
  title VARCHAR(255) NULL,
  comment TEXT NULL,
  verified_purchase TINYINT(1) NOT NULL DEFAULT 0,
  helpful_count INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reviews_product_id (product_id),
  KEY idx_reviews_user_id (user_id),
  CONSTRAINT fk_reviews_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user
    FOREIGN KEY (user_id) REFERENCES user_profiles(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlist_items (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wishlist_user_product (user_id, product_id),
  KEY idx_wishlist_product_id (product_id),
  CONSTRAINT fk_wishlist_user
    FOREIGN KEY (user_id) REFERENCES user_profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS downloads (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  product_id VARCHAR(36) NOT NULL,
  order_id VARCHAR(36) NULL,
  download_count INT NOT NULL DEFAULT 0,
  last_downloaded TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_downloads_user_id (user_id),
  KEY idx_downloads_product_id (product_id),
  KEY idx_downloads_order_id (order_id),
  CONSTRAINT fk_downloads_user
    FOREIGN KEY (user_id) REFERENCES user_profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_downloads_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_downloads_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- App settings & notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NULL DEFAULT 'info',
  `read` TINYINT(1) NOT NULL DEFAULT 0,
  data LONGTEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_id (user_id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES user_profiles(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  id VARCHAR(36) NOT NULL,
  `key` VARCHAR(255) NOT NULL,
  value TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed data (no products)
-- ---------------------------------------------------------------------------

START TRANSACTION;

INSERT INTO settings (id, `key`, value, description)
VALUES
  (UUID(), 'site_name', 'Super Clones', 'Store display name'),
  (UUID(), 'site_tagline', '', 'Store tagline (empty = localized Catalog 2026)'),
  (UUID(), 'support_email', '', 'Support contact email'),
  (UUID(), 'currency', 'EUR', 'Checkout currency code'),
  (UUID(), 'tax_rate', '0', 'Tax rate percentage'),
  (UUID(), 'catalog_mode', 'false', 'Browse-only storefront when true'),
  (UUID(), 'product_card_show_details', 'true', 'Show price and short description on shop product cards'),
  (UUID(), 'site_access_enabled', 'false', 'Site-wide access password gate'),
  (UUID(), 'site_access_password_hash', '', 'Bcrypt hash for site access password'),
  (UUID(), 'site_access_version', '0', 'Increment to invalidate remembered site-access cookies')
ON DUPLICATE KEY UPDATE
  description = COALESCE(NULLIF(VALUES(description), ''), description),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO users (id, email, password_hash, role, is_super_admin, name)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'info@superclones.cloud',
    '$2b$12$ue2o4T2MAp5vd92OehduqO4bc4AR0vXSfmwX4Do268K9p5YLOeTjy',
    'admin',
    1,
    'Super Admin'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'buyer@test.com',
    '$2b$12$Hz1zX52TvRzAgcl/jBhwguLsrFoyA5/eg5T7MAuRyj61mBbTzpxpq',
    'buyer',
    0,
    'Test Buyer'
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'seller@test.com',
    '$2b$12$D8NEOUOYWISKCzCUdcgMWewE6TCvgSStTZo1QKhSBjsY4wGwCS6iK',
    'seller',
    0,
    'Test Seller'
  )
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  is_super_admin = VALUES(is_super_admin),
  name = VALUES(name);

INSERT INTO user_profiles (id, email, name, role)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'info@superclones.cloud', 'Super Admin', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'buyer@test.com', 'Test Buyer', 'buyer'),
  ('a0000000-0000-0000-0000-000000000003', 'seller@test.com', 'Test Seller', 'seller')
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  name = VALUES(name),
  role = VALUES(role);

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
