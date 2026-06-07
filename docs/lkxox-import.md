# Lkxox (Zen Cart) bulk import

Import draft products from [lkxox.com](https://www.lkxox.com) paginated catalog listings (e.g. **3040** products on the “New Products” page).

## Setup

1. Run migration:

   ```bash
   mysql supe_r_clones_cloud < db/lkxox_import.sql
   ```

2. Admin → Import → Add source:
   - **Source type:** Lkxox (Zen Cart)
   - **Catalog list URL:** `https://www.lkxox.com/products_new.html?disp_order=6`
   - **Catalog category (fallback):** e.g. your watches category
   - Brand is auto-detected from each product’s **Brand:** field (Rolex, Breitling, …)

## Sync workflow

1. Click **Start sync** on the source row.
2. Copy the worker command and run locally (with `db:tunnel`) or on the VPS:

   ```bash
   npm run import:worker -- --job=<uuid>
   ```

3. Discovery fetches all listing pages (~127 pages × 24 products) and creates job items.
4. The worker imports each product: title, SKU (Stock Number), full spec description, **price = 0** (Price on request), all gallery images.
5. Images save under `public/images/imports/lkxox/lkxox-{id}/`.
6. Commit and push images in batches:

   ```bash
   git add public/images/imports/lkxox/
   git commit -m "Add lkxox import images batch 1"
   git push
   ```

7. Admin → Import → **Review import queue** → publish.

## Field mapping

| Source | Catalog field |
|--------|----------------|
| `#productName` | `name` |
| Stock Number (spec table) | `sku` |
| Spec table | `description` |
| Brand row | `brand` (auto-created) |
| Source fallback category | `category` |
| All `#productMainImage` URLs | `image_url` + `gallery_images` |
| — | `price` = 0, `original_price` = source retail (reference) |

## Refresh / retry

```bash
npm run import:worker -- --job=<uuid> --refresh --retry-all
```

Re-downloads images and updates existing products (status unchanged).

## Tests

```bash
npm run test:lkxox-map
```
