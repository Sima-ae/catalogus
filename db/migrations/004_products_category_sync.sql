-- Link products to categories and sync the category label with the categories table.
USE supe_r_clones_cloud;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id VARCHAR(36) NULL AFTER category;

ALTER TABLE products
  ADD KEY IF NOT EXISTS idx_products_category_id (category_id);

-- Backfill category_id from exact name match
UPDATE products p
INNER JOIN categories c ON c.name = p.category AND c.active = 1
SET p.category_id = c.id,
    p.category = c.name
WHERE p.category_id IS NULL OR p.category_id <> c.id;

-- Backfill from slug when name differs slightly
UPDATE products p
INNER JOIN categories c
  ON c.slug = LOWER(REPLACE(TRIM(p.category), ' ', '-'))
  AND c.active = 1
SET p.category_id = c.id,
    p.category = c.name
WHERE p.category_id IS NULL;

-- Optional FK (skip if your MariaDB version rejects IF NOT EXISTS on constraints)
-- ALTER TABLE products
--   ADD CONSTRAINT fk_products_category
--   FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
