-- Default storefront settings (safe to re-run)
USE supe_r_clones_cloud;

INSERT INTO settings (id, `key`, value, description)
VALUES
  (UUID(), 'site_name', 'Super Clones', 'Store display name'),
  (UUID(), 'site_tagline', 'Digital marketplace for templates and digital assets', 'Store tagline'),
  (UUID(), 'support_email', '', 'Support contact email'),
  (UUID(), 'currency', 'EUR', 'Checkout currency code'),
  (UUID(), 'tax_rate', '0', 'Tax rate percentage')
ON DUPLICATE KEY UPDATE
  value = IF(VALUES(value) <> '', VALUES(value), value),
  updated_at = CURRENT_TIMESTAMP;
