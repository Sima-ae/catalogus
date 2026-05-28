-- User role badges & super-admin star ratings (run once on existing DBs)
USE supe_r_clones_cloud;

ALTER TABLE users
  ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

ALTER TABLE users
  ADD COLUMN badge_rating TINYINT UNSIGNED NULL DEFAULT NULL AFTER is_super_admin;

-- Mark primary super admin account
UPDATE users
SET is_super_admin = 1
WHERE LOWER(email) = 'info@000.it.com' AND role = 'admin';

-- Optional: constrain rating 1–5 when set
-- ALTER TABLE users ADD CONSTRAINT chk_badge_rating CHECK (badge_rating IS NULL OR badge_rating BETWEEN 1 AND 5);
