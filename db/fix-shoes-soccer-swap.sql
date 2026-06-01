-- Run once on production when SHOES and SOCCER › SHOES show swapped products.
-- Safe to re-run: guarded by settings.migration_shoes_soccer_swapped.

USE supe_r_clones_cloud;

SET @shoes_soccer_swap_done := (
  SELECT value FROM settings WHERE `key` = 'migration_shoes_soccer_swapped' LIMIT 1
);
SET @top_shoes_id := (
  SELECT id FROM categories WHERE active = 1 AND name = 'SHOES' AND parent_id IS NULL LIMIT 1
);
SET @soccer_shoes_id := (
  SELECT c.id
  FROM categories c
  INNER JOIN categories parent ON parent.id = c.parent_id
    AND parent.active = 1
    AND parent.name = 'SOCCER'
    AND parent.parent_id IS NULL
  WHERE c.active = 1 AND c.name = 'SHOES'
  LIMIT 1
);

SELECT
  @shoes_soccer_swap_done AS already_applied,
  @top_shoes_id AS top_level_shoes_id,
  @soccer_shoes_id AS soccer_shoes_id,
  (SELECT COUNT(*) FROM products WHERE category_id = @top_shoes_id) AS products_on_top_shoes_before,
  (SELECT COUNT(*) FROM products WHERE category_id = @soccer_shoes_id) AS products_on_soccer_shoes_before;

UPDATE products
SET category_id = IF(category_id = @top_shoes_id, @soccer_shoes_id, @top_shoes_id)
WHERE IFNULL(@shoes_soccer_swap_done, '') <> '1'
  AND @top_shoes_id IS NOT NULL
  AND @soccer_shoes_id IS NOT NULL
  AND @top_shoes_id <> @soccer_shoes_id
  AND category_id IN (@top_shoes_id, @soccer_shoes_id);

UPDATE import_sources
SET catalog_category_id = IF(
  catalog_category_id = @top_shoes_id,
  @soccer_shoes_id,
  @top_shoes_id
)
WHERE IFNULL(@shoes_soccer_swap_done, '') <> '1'
  AND @top_shoes_id IS NOT NULL
  AND @soccer_shoes_id IS NOT NULL
  AND @top_shoes_id <> @soccer_shoes_id
  AND catalog_category_id IN (@top_shoes_id, @soccer_shoes_id);

INSERT INTO settings (id, `key`, value, description)
SELECT
  UUID(),
  'migration_shoes_soccer_swapped',
  '1',
  'Swapped product assignments between top-level SHOES and SOCCER › SHOES'
FROM DUAL
WHERE IFNULL(@shoes_soccer_swap_done, '') <> '1'
  AND @top_shoes_id IS NOT NULL
  AND @soccer_shoes_id IS NOT NULL
  AND @top_shoes_id <> @soccer_shoes_id
  AND NOT EXISTS (
    SELECT 1 FROM settings WHERE `key` = 'migration_shoes_soccer_swapped'
  );

SELECT
  (SELECT COUNT(*) FROM products WHERE category_id = @top_shoes_id) AS products_on_top_shoes_after,
  (SELECT COUNT(*) FROM products WHERE category_id = @soccer_shoes_id) AS products_on_soccer_shoes_after,
  (SELECT value FROM settings WHERE `key` = 'migration_shoes_soccer_swapped' LIMIT 1) AS migration_flag;
