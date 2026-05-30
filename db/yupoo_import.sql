-- Yupoo bulk import (run on VPS after other migrations)
-- mysql supe_r_clones_cloud < db/yupoo_import.sql

USE supe_r_clones_cloud;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS available_sizes VARCHAR(512) NULL AFTER gallery_images;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS available_colors VARCHAR(512) NULL AFTER available_sizes;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_url TEXT NULL AFTER available_colors;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS source_album_id VARCHAR(64) NULL AFTER source_url;

ALTER TABLE products
  ADD UNIQUE INDEX IF NOT EXISTS uq_products_source_album_id (source_album_id);

CREATE TABLE IF NOT EXISTS import_sources (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  yupoo_category_url TEXT NOT NULL,
  catalog_category_id VARCHAR(36) NULL,
  catalog_brand_id VARCHAR(36) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_synced_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_import_sources_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_jobs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
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
  INDEX idx_import_jobs_source (source_id),
  INDEX idx_import_jobs_status (status),
  CONSTRAINT fk_import_jobs_source FOREIGN KEY (source_id) REFERENCES import_sources (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE import_job_items
  ADD COLUMN IF NOT EXISTS album_title VARCHAR(128) NULL AFTER album_id;

CREATE TABLE IF NOT EXISTS import_job_items (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
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
  INDEX idx_import_job_items_job (job_id),
  INDEX idx_import_job_items_status (status),
  INDEX idx_import_job_items_album (album_id),
  CONSTRAINT fk_import_job_items_job FOREIGN KEY (job_id) REFERENCES import_jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
