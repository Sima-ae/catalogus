-- Minimal fix: only password + role (no is_super_admin column required)
USE supe_r_clones_cloud;

UPDATE users
SET password_hash = '$2b$12$ue2o4T2MAp5vd92OehduqO4bc4AR0vXSfmwX4Do268K9p5YLOeTjy',
    role = 'admin'
WHERE LOWER(email) = 'info@000.it.com';
