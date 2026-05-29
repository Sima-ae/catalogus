-- Super admin login: password Admin123! (see MANUAL_USER_SETUP.md)
-- Safe on DBs that never ran 001_user_badges.sql (adds columns if missing).

USE supe_r_clones_cloud;

-- Add columns when missing (ignore errors if they already exist)
ALTER TABLE users
  ADD COLUMN is_super_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER role;

ALTER TABLE users
  ADD COLUMN badge_rating TINYINT UNSIGNED NULL DEFAULT NULL AFTER is_super_admin;

UPDATE users
SET password_hash = '$2b$12$ue2o4T2MAp5vd92OehduqO4bc4AR0vXSfmwX4Do268K9p5YLOeTjy',
    role = 'admin',
    is_super_admin = 1
WHERE LOWER(email) = 'info@000.it.com';

-- If no row was updated, the user may not exist yet — run db/supe_r_clones_cloud_users.sql
