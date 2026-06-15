# WooCommerce import (stuntxl.com)

## Prerequisites

1. Run DB migrations on the VPS:
   ```bash
   mysql supe_r_clones_cloud < db/woocommerce_import.sql
   mysql supe_r_clones_cloud < db/woocommerce_purchase_price.sql
   ```
   Or apply the WooCommerce sections at the end of `db/upgrade.sql`.

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

## AR Factory (arfactorywatch.com)

[AR Factory](https://www.arfactorywatch.com) is WooCommerce with a public Store API. Import supplier prices as internal **purchase price**; the shop shows **Price on request** (`price = 0`).

1. Open **Admin → Import** → add source:
   - **Name:** `AR Factory — Rolex`
   - **Source type:** WooCommerce
   - **Store URL:** `https://www.arfactorywatch.com`
   - **WC category slug:** `rolex` *(~455 products; use other slugs for AP, Patek, etc.)*
   - **Import supplier price as purchase price:** enabled
   - **Shipping cost (EUR):** e.g. `30` — set per import source (not always the same amount)
   - **Catalog category (fallback):** e.g. `HORLOGES`
   - **Catalog brand (optional):** `Rolex` — overridden per product from Woo attributes when present
2. Click **Sync** and run the worker on the VPS.

| Imported field | Source |
|----------------|--------|
| Title | Woo product name |
| SKU | Woo SKU |
| Images | Woo gallery (mirrored locally) |
| Description | Woo description, or attribute specs when empty |
| Brand | Woo brand or `Brand` attribute |
| `purchase_price` | Lowest Woo price (e.g. $850 for Japanese tier) |
| `price` | `0` (Price on request) |
| `shipping_cost` | Value from **Shipping cost (EUR)** on the import source |
| `product_options` | Variation tiers (e.g. Mechanism: Japanese $850, Swiss $1,650) |

Variable AR Factory products import **Mechanism** options and per-tier prices from WooCommerce variations. Re-sync with `--refresh` to update options on existing products.

Apply DB migration before re-import:

```bash
mysql supe_r_clones_cloud < db/product_options.sql
```

New imports and re-syncs copy the configured shipping cost onto each product. To backfill existing AR Factory products (one-time, uses €30 default):

```bash
npm run db:set-ar-factory-shipping -- --dry-run
npm run db:set-ar-factory-shipping
```

Existing StuntXL sources keep default **storefront** pricing (Woo price shown on the shop).

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
- **Product images** are downloaded to `/images/imports/woocommerce/{wc-id}/` on the VPS (`public_html/images` when `CATALOGUS_PUBLIC_HTML` is set) or to `public/images/` locally (commit + push to deploy).
- Gallery includes **all parent images plus variation images**; thumbnails are upgraded to full size when possible.
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

## Fix broken thumbnails / lightbox images

Normalize paths and re-download missing files (Facebook + WooCommerce):

```bash
npm run db:repair-import-images -- --dry-run
npm run db:repair-import-images -- --remirror
```

Commit new files under `public/images/` and push to deploy.

## Tests

```bash
npm run test:woocommerce-map
```
