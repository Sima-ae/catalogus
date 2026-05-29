-- supe_r_clones_cloud bootstrap (MariaDB-friendly)
-- Import this into your MariaDB database `supe_r_clones_cloud` using your SQL importer.
-- (DB/user creation handled separately; keep passwords secret.)

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS supe_r_clones_cloud
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE supe_r_clones_cloud;

-- products
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  short_description TEXT NULL,
  price DECIMAL(12,2) NOT NULL,
  original_price DECIMAL(12,2) NULL,
  image_url TEXT NOT NULL,
  gallery_images LONGTEXT NULL,
  category VARCHAR(255) NOT NULL,
  category_id VARCHAR(36) NULL,
  tags LONGTEXT NULL,
  author_id VARCHAR(36) NULL,
  author VARCHAR(255) NOT NULL,
  author_icon VARCHAR(64) NOT NULL,
  sku VARCHAR(255) NULL,
  download_url TEXT NULL,
  demo_url TEXT NULL,
  documentation_url TEXT NULL,
  version VARCHAR(64) NULL,
  license_type VARCHAR(255) NULL,
  file_size VARCHAR(255) NULL,
  requirements LONGTEXT NULL,
  features LONGTEXT NULL,
  compatibility TEXT NULL,
  support_url TEXT NULL,
  changelog TEXT NULL,
  rating DECIMAL(3,2) NULL,
  review_count INT NULL,
  download_count INT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  featured TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- categories
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

-- user_profiles (lightweight profile table)
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

-- orders
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

-- order_items
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

-- cart_items
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

-- reviews
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

-- wishlist_items
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

-- downloads
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

-- notifications
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

-- settings
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

START TRANSACTION;

INSERT INTO categories (id, name, slug, description, active)
VALUES ('11111111-1111-1111-1111-111111111111', 'WordPress Theme', 'wordpress-theme', 'Default category', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  active = VALUES(active);

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
