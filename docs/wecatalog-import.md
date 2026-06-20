# WeCatalog bulk import

Import draft products from [WeCatalog](https://wecatalog.cn) category list URLs (Szwego WeShop). The storefront loads products via infinite scroll until **No More Data**; the import worker uses the same underlying JSON API.

## Setup

1. Ensure migrations are applied (WeCatalog reuses `catalog_list_url` from Lkxox):

   ```bash
   mysql supe_r_clones_cloud < db/lkxox_import.sql
   mysql supe_r_clones_cloud < db/wecatalog_import.sql
   ```

2. Admin → Import → Add source:
   - **Source type:** WeCatalog
   - **WeCatalog category list URL:** e.g.  
     `https://tenant.wecatalog.cn/weshop/goods_list/SHOP_ID?groupId=76810891`
   - **Catalog category (fallback):** e.g. your bags category
   - Brand is auto-detected from each product title

## Sync workflow

1. Click **Start sync** on the source row.
2. Copy the worker command and run locally (with `db:tunnel`) or on the VPS:

   ```bash
   npm run import:worker -- --job=<uuid>
   ```

3. Discovery paginates the list API until `isLoadMore` is false and creates job items.
4. The worker imports each product: translated title, description, **price = 0** (Price on request), gallery images.
5. Images save under `public/images/imports/wecatalog/wecatalog-{goodsId}/`.
6. Commit and push images in batches:

   ```bash
   git add public/images/imports/wecatalog/
   git commit -m "Add WeCatalog import images batch 1"
   git push
   ```

7. Admin → Import → **Review import queue** → publish.

## Field mapping

| Source | Catalog field |
|--------|----------------|
| `commodity.title` (first line) | `name` (EN translation + brand fix) |
| Remaining title lines | `description` |
| `goodsNum` or external id | `sku` |
| `imgsSrc` / `imgs` | `image_url` + `gallery_images` |
| Source fallback category | `category` |
| Brand in title | `brand` (auto-created) |
| — | `price` = 0 (Price on request) |
| `itemPrice` / `skuPriceMap` when present | `purchase_price` (admin only) |

## Refresh / retry

```bash
npm run import:worker -- --job=<uuid> --refresh --retry-all
```

Re-downloads images and updates existing products (status unchanged).

## Tests

```bash
npm run test:wecatalog-map
```

## Limitations

- Password-protected WeCatalog shops are not supported in v1.
- The list URL must include `groupId` (category filter from the shop UI).
