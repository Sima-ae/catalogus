# CyberPanel + Catalogus (OpenLiteSpeed / LiteSpeed)

CyberPanel uses **OpenLiteSpeed** (or LiteSpeed). The panel serves a **document root**; Catalogus runs on **port 3001** (`inkoop-autos` stays on **3000**).

---

## Two folders (CyberPanel default)

OpenLiteSpeed vhost config uses:

```text
docRoot    $VH_ROOT/public_html
```

So for `superclones.cloud`, **(B)** is almost always:

```text
/home/superclones.cloud/public_html
```

| Role | Path |
|------|------|
| **A — Git + Node app** | `/var/www/superclones.cloud` (`VPS_APP_PATH`, GitHub deploy) |
| **B — Document root** | `/home/superclones.cloud/public_html` (`$VH_ROOT/public_html`) |

**(A)** and **(B)** are different directories on purpose. No `public_html` under `/var/www/superclones.cloud` is expected.

---

## Step 1 — Confirm docRoot on the VPS

```bash
grep -E 'vhRoot|docRoot' /usr/local/lsws/conf/vhosts/superclones.cloud/vhost.conf
# expect something like:
#   docRoot    $VH_ROOT/public_html
#   vhRoot     /home/superclones.cloud
```

Or CyberPanel → **Websites** → **Manage** → `superclones.cloud`.

Put **`.htaccess`** only in **`$VH_ROOT/public_html`** (folder **B**).

---

## Step 2 — `.htaccess` in document root (B)

```bash
# CyberPanel: docRoot = $VH_ROOT/public_html
DOCROOT=/home/superclones.cloud/public_html

mkdir -p "$DOCROOT"

cat > "$DOCROOT/.htaccess" << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteCond %{HTTP_HOST} ^www\.superclones\.cloud$ [NC]
  RewriteRule ^ https://superclones.cloud%{REQUEST_URI} [R=301,L]

  RewriteRule ^catalogus/?$ / [R=301,L]
  RewriteRule ^catalogus/(.*)$ /$1 [R=301,L]

  RewriteCond %{HTTP_HOST} ^superclones\.cloud$ [NC]
  RewriteRule ^(.*)$ http://127.0.0.1:3001/$1 [P,L]
</IfModule>
EOF

chown -R superclones.cloud:superclones.cloud "$DOCROOT/.htaccess" 2>/dev/null \
  || chown deploy:deploy "$DOCROOT/.htaccess" 2>/dev/null || true
```

Copy from the repo after `git pull`:

```bash
cp /var/www/superclones.cloud/deploy/htaccess.example /home/superclones.cloud/public_html/.htaccess
```

---

## Step 3 — Node app (A) must run

```bash
curl -I http://127.0.0.1:3001/
sudo systemctl unmask catalogus
sudo systemctl restart catalogus
sudo systemctl status catalogus
```

GitHub secret: `VPS_APP_PATH=/var/www/superclones.cloud`

---

## Step 4 — CyberPanel proxy (if `.htaccess` [P] gives 500)

OpenLiteSpeed sometimes blocks `[P]` in `.htaccess`. Use the panel:

### Option A — Rewrite Rules (CyberPanel UI)

1. **Websites** → **List Websites** → **Manage** → `superclones.cloud`
2. **Rewrite Rules** (or **vHost Conf**)
3. Add rules equivalent to `deploy/htaccess.example`, or only www redirect in UI and proxy via Option B

### Option B — OpenLiteSpeed WebAdmin (recommended)

1. CyberPanel → **Websites** → **Manage** → **Open LiteSpeed** / **WebAdmin** (port `7080`)
2. **Virtual Hosts** → `superclones.cloud` → **Context** → **Add**
3. Type: **Proxy**
4. URI: `/`
5. Web Server: `http://127.0.0.1:3001`
6. Save → **Graceful restart**

Then you may not need `[P]` in `.htaccess` — only www redirect:

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.superclones\.cloud$ [NC]
RewriteRule ^ https://superclones.cloud%{REQUEST_URI} [R=301,L]
```

### Option C — SSL / www

CyberPanel → **SSL** → issue Let's Encrypt for `superclones.cloud` and `www.superclones.cloud`.

For **www** website entry: either alias to same vhost or separate site with `htaccess-www-only.example` (redirect only).

---

## Step 5 — `.env` (on app path A)

`/var/www/superclones.cloud/.env`:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://superclones.cloud
NEXT_PUBLIC_BASE_PATH=
```

```bash
sudo -u deploy bash /var/www/superclones.cloud/scripts/deploy.sh
```

---

## Logs (CyberPanel / OpenLiteSpeed)

| Log | Path |
|-----|------|
| OpenLiteSpeed error | `/usr/local/lsws/logs/error.log` |
| Domain access | `/home/superclones.cloud/logs/` (if created) |
| CyberPanel | **Logs** in panel UI |

---

## Your server layout

```text
/home/superclones.cloud/public_html/   ← (B) docRoot — .htaccess HERE
/var/www/superclones.cloud/            ← (A) git clone + Catalogus :3001
```

---

## Related files

- `deploy/htaccess.example` — copy to document root (B)
- `deploy/WHERE-FILES-GO.md` — folder A vs B
- `deploy/LITESPEED.md` — LiteSpeed details
