# Catalogus (Super Clones)

Next.js marketplace for [superclones.cloud](https://superclones.cloud).

## Local development

```bash
cp .env.local.example .env   # set DATABASE_URL password (same as VPS .env)
npm install
```

**Terminal 1** — SSH tunnel to VPS MariaDB (root):

```bash
npm run db:tunnel
```

**Terminal 2** — app:

```bash
npm run dev
```

Open http://localhost:3000

## Production (VPS)

| What | Where |
|------|--------|
| App | `/var/www/superclones.cloud`, systemd `catalogus`, port **3001** |
| Database | MariaDB on same VPS — `DATABASE_URL=...@127.0.0.1:3306/...` in `.env` |
| Product images | `/home/superclones.cloud/public_html/images` (`CATALOGUS_PUBLIC_HTML`) |

Push to `main` → GitHub Actions runs `scripts/deploy.sh` on the server.

### GitHub deploy secrets (same as inkoop.autos)

| Secret | Value |
|--------|--------|
| `VPS_HOST` | e.g. `superclones.cloud` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | **Deploy private key with no passphrase** (not your personal `id_ed25519`) |

**Fastest:** copy `VPS_HOST`, `VPS_USER`, and `VPS_SSH_KEY` from the **inkoop.autos** GitHub repo secrets into this repo.

**Or** on the VPS once as root:

```bash
bash /var/www/superclones.cloud/scripts/setup-github-deploy-ssh.sh
```

Paste the printed private key into GitHub → **VPS_SSH_KEY**. Your personal SSH key and passphrase stay on your Mac only.

Manual deploy on VPS: `bash /var/www/superclones.cloud/scripts/deploy.sh`

### Deploy fails: `Cannot reach …:22`

GitHub Actions runs on **datacenter IPs**, not your Mac. SSH from your laptop can work while CI fails.

1. **GitHub secrets** (repo → Settings → Secrets → Actions):
   - `VPS_HOST` = `superclones.cloud` (public DNS) — **not** the internal name from `hostname` (e.g. `do-it`)
   - `VPS_USER` = `root`
   - `VPS_SSH_KEY` = deploy private key with **no passphrase** (same as inkoop.autos, or from `setup-github-deploy-ssh.sh`)
   - Optional: `VPS_SSH_PORT` if SSH is not on 22
2. **On the VPS as root:**
   ```bash
   bash /var/www/superclones.cloud/scripts/setup-github-deploy-ssh.sh
   bash /var/www/superclones.cloud/scripts/vps-check-github-ssh.sh
   ```
3. **Firewall:** open inbound TCP 22 (or your SSH port). On the VPS as root:
   ```bash
   bash /var/www/superclones.cloud/scripts/vps-allow-github-actions-ssh.sh 22
   ```
   If a run failed with **This job egress IP: 20.x.x.x**, unblock that IP too:
   ```bash
   bash /var/www/superclones.cloud/scripts/vps-unban-deploy-ip.sh 20.171.55.50
   # or: bash /var/www/superclones.cloud/scripts/vps-allow-github-actions-ssh.sh 22 20.171.55.50
   ```
   Changing `VPS_HOST` from `do-it.vip` to `superclones.cloud` does **not** help if both names resolve to the same server IP.

4. If DNS shows **do-it.vip** but the site is **superclones.cloud**, set `VPS_HOST` to `superclones.cloud` in GitHub secrets (same server, clearer DNS).

Until CI SSH works, deploy manually: `bash /var/www/superclones.cloud/scripts/deploy.sh`

### “Database is not available” on the live site

On the VPS as root:

```bash
cd /var/www/superclones.cloud
bash scripts/vps-db-diagnose.sh
```

Usually `DATABASE_URL` in `.env` has the wrong password or database name. Copy from **CyberPanel → Databases** (user/db: `supe_r_clones_cloud`), then:

```bash
nano .env   # fix DATABASE_URL=mysql://supe_r_clones_cloud:PASSWORD@127.0.0.1:3306/supe_r_clones_cloud
systemctl restart catalogus
```

## Database (MariaDB)

Import on the VPS (phpMyAdmin or `mysql`):

1. `db/supe_r_clones_cloud_init.sql`
2. `db/supe_r_clones_cloud_users.sql`
3. `db/upgrade.sql` (older DBs only)
4. `db/brands.sql`
5. `db/brand_categories.sql`

Reset super-admin on VPS:

```bash
cd /var/www/superclones.cloud
node scripts/reset-admin-password.mjs 'YourStrongPassword'
```

## Security

- Never commit `.env`.
- Production: `AUTH_DEV_FALLBACK=false`, strong `SITE_ACCESS_COOKIE_SECRET`.
