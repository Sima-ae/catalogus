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

## Import one product by URL

Use this when a product was **skipped** in bulk sync (already in catalog) or was never picked up:

1. On the WooCommerce import source row, paste the product URL, e.g.  
   `https://stuntxl.com/product/gmt-master-ii-pepsi-v3-meteorite-gain-weight-195gr/`
2. Click **Import product URL**.
3. Run the worker command shown — it includes `--refresh` so the existing product is updated instead of skipped.

API: `POST /api/admin/import/sources/{id}/import-product` with `{ "productUrl": "..." }`.

## Review and publish

1. Open **Admin → Import → Review**.
2. Check draft products (title, price, brand, category, images).
3. Publish individually or bulk publish.

## Notes

- Uses the public WooCommerce Store API (`/wp-json/wc/store/v1/products`) — no API keys required for stuntxl.com.
- **Product images are downloaded to the VPS** under `/images/imports/woocommerce/{wc-id}/` during import (not hotlinked from stuntxl.com).
- Brands from WooCommerce are **auto-created** in Admin → Brands when missing.
- Products without a WooCommerce category use the **fallback catalog category** on the import source.
- External id stored as `wc-{productId}` in `products.source_album_id` (same dedup/review flow as Yupoo).

## Migrate images for products imported before mirroring

If products still point at `stuntxl.com` URLs, run on the **VPS** (while stuntxl is still online):

```bash
npm run db:mirror-woocommerce-images
```

Dry-run first:

```bash
npm run db:mirror-woocommerce-images -- --dry-run
```

Re-import with refresh also re-downloads images:

```bash
npm run import:worker -- --job=<uuid> --refresh --retry-all
```

## Tests

```bash
npx tsx scripts/test-woocommerce-map.ts
```
