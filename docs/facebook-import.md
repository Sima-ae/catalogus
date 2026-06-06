# Facebook post import

Import draft products from a single Facebook post URL. Title, description, and images are fetched automatically; **price, SKU, category, and brand** are entered manually in admin when queuing the import.

## Supported URL format (primary)

Use the **permalink** link from Facebook — this is the standard format for supplier posts:

```
https://www.facebook.com/permalink.php?story_fbid=pfbid0fkLmBC…&id=61565503873297
```

Copy the URL from **Share → Copy link** on the post, or from the browser address bar when viewing the post.

Photo-only links (`photo?fbid=…&set=pcb.…`) also work, but permalink URLs are preferred.

## Setup

1. Run migration (optional — `source_type` already supports `facebook`):

   ```bash
   mysql supe_r_clones_cloud < db/facebook_import.sql
   ```

2. Add Graph API token on the VPS (required for reliable imports in production):

   ```env
   FACEBOOK_GRAPH_ACCESS_TOKEN=your_page_or_user_token
   ```

   Use a **Page access token** for the supplier page, or a User token with `pages_read_engagement`.
   Permalink posts are fetched via Graph **scrape** (POST) using this token. Without it, imports may fail when Facebook serves a login wall to the server.

## Admin workflow

1. **Super admin** → Admin → Import → Add source → type **Facebook** (name only).
2. On the source row, paste the **permalink URL**, then fill in:
   - Price, SKU, category, brand(s)
   - Optional: **Preview post** (shows title, image count, emoji price hint like `4️⃣5️⃣0️⃣` → 450)
3. Click **Import post** → copy worker command.
4. On VPS:

   ```bash
   npm run import:worker -- --job=<uuid> --refresh
   ```

5. Admin → Import → **Review import queue** → edit if needed → Publish.

## Debug on VPS

```bash
npx tsx scripts/debug-fb-fetch.ts 'https://www.facebook.com/permalink.php?story_fbid=…&id=…'
```

Shows Graph API errors if the token lacks permissions.

## Images

Mirrored to the VPS (same pattern as WooCommerce):

```
public/images/imports/facebook/fb-pfbid0fkLmBC…/001.jpg
public/images/imports/facebook/fb-pfbid0fkLmBC…/002.jpg
```

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
