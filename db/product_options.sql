-- Product variant options (e.g. Mechanism: Japanese / Swiss with per-option prices).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_options LONGTEXT NULL AFTER available_colors;
