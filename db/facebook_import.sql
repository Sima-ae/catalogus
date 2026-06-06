-- Facebook post import source type (run on VPS after woocommerce_import.sql)
-- mysql supe_r_clones_cloud < db/facebook_import.sql

USE supe_r_clones_cloud;

-- source_type VARCHAR(32) already supports 'facebook' — no new columns required.
-- Optional: document-only migration for operators.

SELECT 'Facebook import uses source_type=facebook on import_sources' AS note;
