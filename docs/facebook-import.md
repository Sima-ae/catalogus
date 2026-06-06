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

2. On the **VPS** `.env` (required for production):

   ```env
   CATALOGUS_PUBLIC_HTML=/home/superclones.cloud/public_html
   FACEBOOK_GRAPH_ACCESS_TOKEN=your_page_or_user_token
   ```

   `CATALOGUS_PUBLIC_HTML` makes the worker save images under `public_html/images/` on the server — **not** inside the git repo and **not** via deploy.

   Run once after deploy:

   ```bash
   bash scripts/ensure-catalog-images-access.sh
   ```

3.    Graph token: use a **Page access token** for the supplier page, or a User token with `pages_read_engagement`.

   Carousel posts often embed only a handful of photos in the HTML; the importer reads the album/post ids from the page and uses Graph to fetch **all** carousel photos (with pagination). Without the token you typically get only ~5–6 images.

## Admin workflow

1. **Super admin** → Admin → Import → Add source → type **Facebook** (name only).
2. On the source row, paste the **permalink URL**, then fill in price, category, brand(s). SKU is assigned automatically when you queue the import.
3. Click **Import post** → copy worker command.
4. **On the VPS** (SSH into the server — do not run the worker on your laptop for production):

   ```bash
   cd /var/www/catalogus   # or your app path on the VPS
   npm run import:worker -- --job=<uuid> --refresh
   ```

   The worker downloads Facebook images directly to:

   ```
   /home/superclones.cloud/public_html/images/imports/facebook/{id}/001.jpg
   ```

   Products store site-relative URLs (`/images/imports/facebook/…`) — the live site serves them from `public_html/images`. **No git push or deploy needed for images.**

5. Admin → Import → **Review import queue** → edit if needed → Publish.

### Local dev (optional)

With `db:tunnel`, you can queue jobs from local admin but still run the worker **on the VPS** for images. If you run the worker locally without `CATALOGUS_PUBLIC_HTML`, files go to `public/images/imports/` for testing only (gitignored).

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
