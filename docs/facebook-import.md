# Facebook post import

Import draft products from a single Facebook post URL. Title, description, and images are fetched automatically; **price, category, and brand** are entered manually in admin when queuing the import. A unique numeric **SKU** (e.g. `3792`) is generated automatically.

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

2. **Facebook Graph token** (optional but recommended for full carousel):

   ```env
   FACEBOOK_GRAPH_ACCESS_TOKEN=your_page_or_user_token
   ```

   Graph token: use a **Page access token** for the supplier page, or a User token with `pages_read_engagement`.

   Carousel posts often embed only a handful of photos in the HTML; the importer reads the album/post ids from the page and uses Graph to fetch **all** carousel photos (with pagination). Without the token you typically get only ~5–6 images.

## Image storage

Import images are saved under `public/images/imports/facebook/` in this repo. **Commit and push** `public/images/` so deploy copies them to the VPS (same as before VPS-only storage).

Products store site-relative URLs (`/images/imports/facebook/…`). On the VPS, `scripts/link-public-images.sh` symlinks `public/images` → `public_html/images` for nginx.

## Admin workflow

1. **Super admin** → Admin → Import → Add source → type **Facebook** (name only).
2. On the source row, paste the **permalink URL**, then fill in price, category, brand(s). SKU is assigned automatically when you queue the import.
3. Click **Import post** → copy worker command.
4. Run the import worker (local Mac with `db:tunnel`, or on the VPS):

   ```bash
   npm run import:worker -- --job=<uuid> --refresh
   ```

   Images are written to `public/images/imports/facebook/{id}/001.jpg`, etc. Then:

   ```bash
   git add public/images/imports/
   git commit -m "Add Facebook import images"
   git push
   ```

5. Admin → Import → **Review import queue** → edit if needed → Publish.

### Fix broken / missing import images

If thumbnails or the product lightbox show broken images after import or deploy:

```bash
npm run db:repair-import-images -- --dry-run
npm run db:repair-import-images -- --remirror
```

Then commit any new files under `public/images/` and push.

### Local dev

With `db:tunnel`, queue jobs from local admin and run the worker locally. Images land in `public/images/imports/` — commit and push when ready for production.

## Debug on VPS

```bash
npx tsx scripts/debug-fb-fetch.ts 'https://www.facebook.com/permalink.php?story_fbid=…&id=…'
```

## Field mapping

| Source | Field |
|--------|--------|
| Post (auto) | `name`, `description`, `short_description`, `image_url`, `gallery_images`, `source_url`, `source_album_id` |
| Form (manual) | `price`, `category`, `category_id`, `brand` |
| Auto | `sku` (unique random numeric, e.g. `3792`) |
| Hint only | Emoji/plain price in post text (preview; form price always wins) |

## Tests

```bash
npm run test:facebook-map
```
