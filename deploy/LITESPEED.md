# LiteSpeed + Next.js (superclones.cloud)

Your 404 page (**LiteSpeed Web Server**) means the web server is looking for static files in **document root** (usually `public_html`). It is **not** talking to the Catalogus app on port **3001**.

This project is **not** a PHP/static site. You need:

1. **Node app running** (`catalogus` on port **3001** — port **3000** is `inkoop-autos` on this VPS)
2. **LiteSpeed proxy** from the domain → `http://127.0.0.1:3001/`

---

## Architecture

```text
Browser → LiteSpeed (public_html + .htaccess) → proxy [P] → Catalogus :3001
                ↑
         Git clone / deploy at VPS_APP_PATH (e.g. /var/www/superclones.cloud)
```

GitHub deploy updates the **git folder** and restarts Node. It does **not** copy HTML into `public_html` unless that folder is your clone.

---

## Step 1 — Node app must be running

On the VPS:

```bash
sudo systemctl unmask catalogus
sudo systemctl status catalogus
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3001/
```

You want **`200`** (or `304`). If connection refused, fix deploy first:

```bash
sudo -u deploy bash /var/www/superclones.cloud/scripts/deploy.sh
sudo systemctl restart catalogus
```

---

## Step 2 — `.htaccess` in document root

Find where LiteSpeed serves the domain (**CyberPanel** → Websites → Manage → document root; see `deploy/CYBERPANEL.md`), often:

```text
/home/YOUR_USER/domains/superclones.cloud/public_html
```

Copy `deploy/htaccess.example` to **that** folder as `.htaccess`:

```bash
DOCROOT=/home/YOUR_USER/domains/superclones.cloud/public_html   # your real path
sudo cp /var/www/superclones.cloud/deploy/htaccess.example "$DOCROOT/.htaccess"
sudo chown YOUR_USER:YOUR_USER "$DOCROOT/.htaccess"
```

Or create manually — minimum content:

```apache
RewriteEngine On
RewriteRule ^catalogus/?$ / [R=301,L]
RewriteRule ^catalogus/(.*)$ /$1 [R=301,L]
RewriteRule ^(.*)$ http://127.0.0.1:3001/$1 [P,L]
```

**www (500 or 404):** LiteSpeed often breaks `[P]` proxy on the `www` vhost. **Best fix:** redirect `www` → apex **before** proxying:

```apache
RewriteCond %{HTTP_HOST} ^www\.superclones\.cloud$ [NC]
RewriteRule ^ https://superclones.cloud%{REQUEST_URI} [R=301,L]
```

In CyberPanel, point **www** and **apex** to the **same** document root and use `deploy/htaccess.example`.

If `www` uses a **separate** document root, put only `deploy/htaccess-www-only.example` there (simple redirect, no `[P]`).

**500 Internal Server Error** on www usually means:
- `[P]` proxy not allowed on www vhost → use www redirect only (above)
- Bad `.htaccess` syntax → test with only the www redirect lines
- Node down → `curl http://127.0.0.1:3001/` on VPS

Check LiteSpeed error log: `/usr/local/lsws/logs/error.log` or CyberPanel → Logs.

---

## Step 3 — If `[P]` proxy is not allowed

Some hosts disable Apache-style proxy in `.htaccess`. Then use one of:

| Option | Action |
|--------|--------|
| **Hostinger hPanel** | Websites → Node.js → attach app to domain, startup: `npm run start`, root: your clone path |
| **LiteSpeed WebAdmin** | Virtual Host → Context → Type **Proxy** → `http://127.0.0.1:3001` |
| **Support** | Ask to enable `mod_proxy` / LiteSpeed proxy for your account |

---

## Step 4 — `.env` on the server

In `/var/www/superclones.cloud/.env` (or your clone path):

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://superclones.cloud
NEXT_PUBLIC_BASE_PATH=
```

Rebuild after changes:

```bash
sudo -u deploy bash /var/www/superclones.cloud/scripts/deploy.sh
```

---

## Common mistakes

| Symptom | Cause |
|---------|--------|
| LiteSpeed 404 | No `.htaccess` proxy, or wrong document root |
| 404 only on www | `.htaccess` missing on www vhost / alias |
| Old site content | LiteSpeed still serving files in `public_html` without proxy |
| 502 Bad Gateway | Catalogus not running on 3001 |
| `/catalogus` 404 | Remove old path; use redirects in `.htaccess` |

---

## Nginx (if you switch later)

Use `deploy/nginx-catalogus.conf.example` instead of `.htaccess`.
