# Catalogus (Super Clones)

Next.js marketplace for [superclones.cloud](https://superclones.cloud).

## Local development

```bash
cp .env.local.example .env
npm install
npm run dev
```

With MariaDB (Docker): `npm run dev:local`  
With remote DB: `npm run db:tunnel` then `npm run dev`

## Database (MariaDB)

Import in order via phpMyAdmin or `mysql`:

1. `db/supe_r_clones_cloud_init.sql` — schema
2. `db/supe_r_clones_cloud_users.sql` — seed users (bcrypt hashes only)
3. `db/upgrade.sql` — only if upgrading an older database  
4. `db/brands.sql` — brands table + product `brand` columns (if missing after deploy)  
5. `db/brand_categories.sql` — link brands to categories (many-to-many)

Reset super-admin password on the server:

```bash
node scripts/reset-admin-password.mjs 'YourStrongPassword'
```

## Production deploy

- GitHub Actions deploys `main` as **root** (`VPS_USER=root`, SSH key in `/root/.ssh/authorized_keys`).
- On the VPS: `bash scripts/deploy.sh` (same user as `catalogus` systemd — root).
- `.env`: `AUTH_DEV_FALLBACK=false`, `DATABASE_URL`, `CATALOGUS_PUBLIC_HTML`, `SITE_ACCESS_COOKIE_SECRET`, Stripe keys.
- LiteSpeed proxies to Node on port **3001**. See `deploy/catalogus.service` and `deploy/htaccess.example`.

**One-time switch from `deploy` user** (if you used that before):

```bash
chown -R root:root /var/www/superclones.cloud
cp /var/www/superclones.cloud/deploy/catalogus.service /etc/systemd/system/catalogus.service
systemctl daemon-reload && systemctl restart catalogus
# GitHub repo secret: VPS_USER=root
```

## Security

- Never commit `.env`.
- No credentials in the UI or API error messages.
- Production: `AUTH_DEV_FALLBACK=false`, strong `SITE_ACCESS_COOKIE_SECRET`.
