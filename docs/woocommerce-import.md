# WooCommerce import (stuntxl.com)

## Prerequisites

1. Run DB migration on the VPS:
   ```bash
   mysql supe_r_clones_cloud < db/woocommerce_import.sql
   ```
   Or apply the WooCommerce section at the end of `db/upgrade.sql`.

2. Deploy the app with the unified import worker.

## Create import source (Admin)

1. Open **Admin → Import**.
2. Add source:
   - **Name:** `StuntXL — all products`
   - **Source type:** WooCommerce
   - **Store URL:** `https://stuntxl.com`
   - **WC category slug:** *(leave empty for all ~36 products)*
   - **Catalog category (fallback):** e.g. `HORLOGES`
3. Click **Sync** and copy the worker command.

Optional filtered source later:

- **WC category slug:** `dames-horloges` or `heren-horloges`
- Same fallback catalog category or a more specific subcategory

## Run import worker (VPS)

```bash
npm run import:worker -- --job=<uuid-from-admin>
```

Re-sync existing products (keeps draft/active status):

```bash
npm run import:worker -- --job=<uuid> --refresh --retry-all
```

## Review and publish

1. Open **Admin → Import → Review**.
2. Check draft products (title, price, brand, category, images).
3. Publish individually or bulk publish.

## Notes

- Uses the public WooCommerce Store API (`/wp-json/wc/store/v1/products`) — no API keys required for stuntxl.com.
- Brands from WooCommerce are **auto-created** in Admin → Brands when missing.
- Products without a WooCommerce category use the **fallback catalog category** on the import source.
- External id stored as `wc-{productId}` in `products.source_album_id` (same dedup/review flow as Yupoo).

## Tests

```bash
npx tsx scripts/test-woocommerce-map.ts
```
