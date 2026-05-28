# GitHub → VPS auto deploy

Every push to **`main`** runs a build check, then SSHs into your VPS, runs `git pull`, `npm ci`, `npm run build`, and restarts the app.

Production URL: **https://superclones.cloud/catalogus/**

---

## 1. One-time VPS setup

SSH into the server as root (or sudo user):

```bash
# Example: clone and bootstrap
export APP_DIR=/var/www/superclones.cloud/catalogus
curl -fsSL https://raw.githubusercontent.com/Sima-ae/catalogus/main/scripts/vps-first-setup.sh | sudo bash
# Or from a local clone:
sudo bash scripts/vps-first-setup.sh
```

Edit production env (never commit this file):

```bash
sudo nano /var/www/superclones.cloud/catalogus/.env
```

Use values from `.env.vps.example` (`AUTH_DEV_FALLBACK=false`, MariaDB `DATABASE_URL`, Stripe keys, `NEXT_PUBLIC_*`).

Install nginx snippet from `deploy/nginx-catalogus.conf.example`, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

First manual deploy:

```bash
cd /var/www/superclones.cloud/catalogus
sudo -u deploy bash scripts/deploy.sh
```

---

## 2. Deploy SSH key for GitHub Actions

On your **local machine** (or VPS), create a key used only for deploy:

```bash
ssh-keygen -t ed25519 -C "github-catalogus-deploy" -f ~/.ssh/catalogus_deploy -N ""
```

On the **VPS**, add the **public** key:

```bash
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys   # paste contents of catalogus_deploy.pub
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Give `deploy` read access to the app and git:

```bash
sudo chown -R deploy:deploy /var/www/superclones.cloud/catalogus
```

Test from your Mac:

```bash
ssh -i ~/.ssh/catalogus_deploy deploy@YOUR_VPS_IP "cd /var/www/superclones.cloud/catalogus && git status"
```

---

## 3. GitHub repository secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Example | Description |
|--------|---------|-------------|
| `VPS_HOST` | `89.116.38.197` or `superclones.cloud` | Server hostname |
| `VPS_USER` | `deploy` | SSH user |
| `VPS_SSH_KEY` | *(full private key)* | Contents of `catalogus_deploy` |
| `VPS_APP_PATH` | `/var/www/superclones.cloud/catalogus` | App directory on server |
| `VPS_SSH_PORT` | `22` | Optional; omit if default |

Paste the **entire** private key for `VPS_SSH_KEY`, including `-----BEGIN ...-----` lines.

---

## 4. How deploy works

Workflow file: `.github/workflows/deploy.yml`

1. **Build check** on GitHub (same as production: `NODE_ENV=production`, `/catalogus` base path).
2. **SSH deploy** runs on the VPS:
   - `git fetch` + `git reset --hard origin/main` (keeps `.env` — not in git)
   - `scripts/deploy.sh` → `npm ci` → `npm run build` → `systemctl restart catalogus`

Trigger manually: **Actions → Deploy to VPS → Run workflow**.

---

## 5. Git remote on VPS

The VPS clone must use SSH or HTTPS with access to pull from GitHub:

```bash
sudo -u deploy bash -c 'cd /var/www/superclones.cloud/catalogus && git remote -v'
# HTTPS (public repo):
sudo -u deploy bash -c 'cd /var/www/superclones.cloud/catalogus && git remote set-url origin https://github.com/Sima-ae/catalogus.git'
```

For a **private** repo, use a deploy key or machine user token on the server.

---

## 6. Troubleshooting

| Issue | Fix |
|-------|-----|
| `Permission denied (publickey)` | Check `VPS_SSH_KEY`, `VPS_USER`, `authorized_keys` |
| `git fetch` fails | Set `origin` URL; for private repos add deploy key on GitHub |
| Build fails on VPS | Check Node ≥ 18 (`node -v`), RAM (needs ~1GB for build) |
| App 502 after deploy | `sudo systemctl status catalogus` and `journalctl -u catalogus -n 50` |
| Wrong URL paths | `.env` must have `NEXT_PUBLIC_BASE_PATH=/catalogus` before `npm run build` |

---

## 7. What is **not** deployed via git

- `.env` — stays only on the server
- `node_modules` / `.next` — rebuilt on each deploy
- Database — run SQL imports manually when schema changes (`db/*.sql`)
