-- Personal site-access codes (one code per buyer when assigned).
-- Import after users table exists. Seed with: npm run db:seed-site-access-codes

SET NAMES utf8mb4;
USE supe_r_clones_cloud;

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
