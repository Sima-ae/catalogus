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

- GitHub Actions SSHs as **root** using your **existing** root key — do not generate or change server keys.
- On the VPS: `bash scripts/deploy.sh` (same user as `catalogus` systemd — root).
- `.env`: `AUTH_DEV_FALLBACK=false`, `DATABASE_URL`, `CATALOGUS_PUBLIC_HTML`, `SITE_ACCESS_COOKIE_SECRET`, Stripe keys.
- LiteSpeed proxies to Node on port **3001**. See `deploy/catalogus.service` and `deploy/htaccess.example`.

### GitHub Actions secrets

| Secret | Value |
|--------|--------|
| `VPS_HOST` | Server hostname or IP |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | **Same private key** you already use: `ssh -i ~/.ssh/your_key root@host` |
| `VPS_APP_PATH` | `/var/www/superclones.cloud` (optional) |

`VPS_SSH_KEY` must match a public key **already** in `/root/.ssh/authorized_keys`. Do not edit `authorized_keys` for CI unless you rotate keys on purpose.

If deploy fails with `Permission denied (publickey)`, fix the **GitHub secret** (wrong key pasted, missing newlines, or `VPS_USER` not `root`) — not the server.

```bash
# Local test (must succeed before Actions will work):
ssh -i /path/to/your_existing_root_key root@your-host 'echo OK'
```

**App ownership (one-time):**

```bash
chown -R root:root /var/www/superclones.cloud
cp /var/www/superclones.cloud/deploy/catalogus.service /etc/systemd/system/catalogus.service
systemctl daemon-reload && systemctl restart catalogus
```

## Security

- Never commit `.env`.
- No credentials in the UI or API error messages.
- Production: `AUTH_DEV_FALLBACK=false`, strong `SITE_ACCESS_COOKIE_SECRET`.
