-- WeCatalog import sources (run after yupoo_import.sql / lkxox_import.sql)
-- mysql supe_r_clones_cloud < db/wecatalog_import.sql
--
-- No schema changes: source_type = 'wecatalog' reuses catalog_list_url from lkxox_import.sql.
-- Example list URL:
--   https://tenant.wecatalog.cn/weshop/goods_list/SHOP_ID?groupId=76810891

USE supe_r_clones_cloud;

-- catalog_list_url holds the WeCatalog category list URL (must include groupId).
