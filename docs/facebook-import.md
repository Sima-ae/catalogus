# Facebook post import

Import draft products from a single Facebook post URL. Title, description, and images are fetched automatically; **price, SKU, category, and brand** are entered manually in admin when queuing the import.

## Setup

1. Run migration (optional — `source_type` already supports `facebook`):

   ```bash
   mysql supe_r_clones_cloud < db/facebook_import.sql
   ```

2. (Recommended) Add Graph API token on the VPS for richer post data:

   ```env
   FACEBOOK_GRAPH_ACCESS_TOKEN=your_page_or_app_token
   ```

   Without a token, the worker tries oEmbed and HTML Open Graph meta (best-effort).

## Admin workflow

1. **Super admin** → Admin → Import → Add source → type **Facebook** (name only).
2. On the source row, fill in:
   - Facebook post URL
   - Price, SKU, category, brand(s)
   - Optional: **Preview post** (shows title, image count, emoji price hint like `4️⃣5️⃣0️⃣` → 450)
3. Click **Import post** → copy worker command.
4. On VPS:

   ```bash
   npm run import:worker -- --job=<uuid> --refresh
   ```

5. Admin → Import → **Review import queue** → edit if needed → Publish.

## Images

Mirrored to the VPS (same pattern as WooCommerce):

```
public/images/imports/facebook/{externalId}/001.jpg
public/images/imports/facebook/{externalId}/002.jpg
```

Public URLs: `/images/imports/facebook/fb-pfbid…/001.jpg`

## Field mapping

| Source | Field |
|--------|--------|
| Post (auto) | `name`, `description`, `short_description`, `image_url`, `gallery_images`, `source_url`, `source_album_id` |
| Form (manual) | `price`, `sku`, `category`, `category_id`, `brand` |
| Hint only | Emoji/plain price in post text (preview; form price always wins) |

## Tests

```bash
npm run test:facebook-map
```
