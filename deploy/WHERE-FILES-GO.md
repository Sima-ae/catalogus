# Where files go on the VPS (simple guide)

You have **two different roles**, not two copies of the whole app.

## The two places

| Place | What goes there | Example path |
|-------|------------------|--------------|
| **A. App folder (git + Node)** | Full Catalogus repo from GitHub: `src/`, `package.json`, `.env`, `npm run build`, `npm run start` | `/var/www/superclones.cloud` |
| **B. Web root (`public_html`)** | What **LiteSpeed** opens in the browser. Usually **only** `.htaccess` (and maybe `index.html` you don’t need for Next.js) | `.../public_html` |

```text
Visitor → LiteSpeed reads (B) public_html/.htaccess
              → proxy → Node app running in (A) /var/www/superclones.cloud
```

GitHub deploy updates **(A)** only.  
Your **`.htaccess`** from `htaccess.example` goes in **(B)** only.

---

## Which path is (B) on your server?

**CyberPanel / OpenLiteSpeed** (your setup):

```text
docRoot    $VH_ROOT/public_html
```

For `superclones.cloud`:

| | Path |
|---|------|
| **(A) App** | `/var/www/superclones.cloud` |
| **(B) Web root** | `/home/superclones.cloud/public_html` |

```bash
cp /var/www/superclones.cloud/deploy/htaccess.example \
   /home/superclones.cloud/public_html/.htaccess
```

See `deploy/CYBERPANEL.md`. On cPanel-style hosts, document root may differ; use the path the panel shows.

---

## Is (A) the same as (B)?

### Case 1 — Same folder (simplest)

```text
/var/www/superclones.cloud/
  ├── .htaccess          ← copy of htaccess.example HERE
  ├── .env
  ├── src/
  ├── package.json
  └── ...
```

Then:

- `VPS_APP_PATH` = `/var/www/superclones.cloud`
- LiteSpeed document root = `/var/www/superclones.cloud`

### Case 2 — Separate (very common)

```text
/var/www/superclones.cloud/          ← (A) git clone, GitHub deploy
  ├── src/
  ├── .env
  └── ...                            NO .htaccess required here

/home/user/domains/superclones.cloud/public_html/   ← (B) web root
  └── .htaccess                      ONLY htaccess.example → .htaccess
```

Then:

- `VPS_APP_PATH` = `/var/www/superclones.cloud`
- `.htaccess` = inside **public_html** (not inside the git folder unless that *is* public_html)

### Case 3 — Repo wrongly only in public_html

If you cloned git **inside** `public_html`, then (A) and (B) are the same path — use Case 1 and set `VPS_APP_PATH` to that `public_html` path.

---

## What to run on the VPS to see your layout

```bash
# App / git (should have package.json and .git)
ls -la /var/www/superclones.cloud/

# If this exists, it is often the web root (LiteSpeed)
ls -la /var/www/superclones.cloud/public_html/

# Node listening?
curl -I http://127.0.0.1:3001/
```

---

## Your `htaccess.example` — what it does

It does **not** store your app files. It only tells LiteSpeed:

1. `www.superclones.cloud` → redirect to `https://superclones.cloud`
2. `/catalogus` → redirect to `/`
3. Everything else → proxy to `http://127.0.0.1:3001` (Catalogus in folder A; port 3000 is inkoop-autos)

Copy it:

```bash
# Replace DOCROOT with your panel’s Document root path
DOCROOT=/var/www/superclones.cloud/public_html   # example — use YOUR path
cp /var/www/superclones.cloud/deploy/htaccess.example "$DOCROOT/.htaccess"
```

If document root is `/var/www/superclones.cloud` (no public_html):

```bash
cp /var/www/superclones.cloud/deploy/htaccess.example /var/www/superclones.cloud/.htaccess
```

---

## GitHub secret

`VPS_APP_PATH` = folder **(A)** where `.git` and `package.json` live  
(not necessarily `public_html`)

---

## Quick checklist

| Item | Location |
|------|----------|
| Git repo | `VPS_APP_PATH` (e.g. `/var/www/superclones.cloud`) |
| `.env` | Same as git repo |
| `npm run build` / `npm run start` | Same as git repo |
| `.htaccess` | **Document root** (`public_html` or same folder if combined) |
| GitHub Actions | Updates git repo (A), restarts Node |
