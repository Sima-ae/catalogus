-- Users for login (MariaDB)
-- Import after supe_r_clones_cloud_init.sql (or standalone if user_profiles already exists).

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS supe_r_clones_cloud
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE supe_r_clones_cloud;

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

START TRANSACTION;

INSERT INTO users (id, email, password_hash, role, is_super_admin, name)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'info@000.it.com',
    '$2b$12$iz2gPv3bl4I5lOQvYXFib.SLiOiXnqYAU8PV3rRJdhzo1p837TWqq',
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
  ('a0000000-0000-0000-0000-000000000001', 'info@000.it.com', 'Super Admin', 'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'buyer@test.com', 'Test Buyer', 'buyer'),
  ('a0000000-0000-0000-0000-000000000003', 'seller@test.com', 'Test Seller', 'seller')
ON DUPLICATE KEY UPDATE
  email = VALUES(email),
  name = VALUES(name),
  role = VALUES(role);

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
