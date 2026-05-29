-- Extra product page fields (features/requirements already exist; add compatibility + support URL)
USE supe_r_clones_cloud;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compatibility TEXT NULL AFTER requirements;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS support_url TEXT NULL AFTER documentation_url;
