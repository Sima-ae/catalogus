# GitHub → VPS auto deploy

Every push to **`main`** runs a build check, then SSHs into your VPS, runs `git pull`, `npm ci`, `npm run build`, and restarts the app.

Production URL: **https://superclones.cloud/**

---

## 1. One-time VPS setup

SSH into the server as root (or sudo user):

```bash
# Example: clone and bootstrap
export APP_DIR=/var/www/superclones.cloud
curl -fsSL https://raw.githubusercontent.com/Sima-ae/catalogus/main/scripts/vps-first-setup.sh | sudo bash
# Or from a local clone:
sudo bash scripts/vps-first-setup.sh
```

Edit production env (never commit this file):

```bash
sudo nano /var/www/superclones.cloud/.env
```

Use values from `.env.vps.example` (`AUTH_DEV_FALLBACK=false`, MariaDB `DATABASE_URL`, Stripe keys, `NEXT_PUBLIC_*`).

Install nginx snippet from `deploy/nginx-catalogus.conf.example`, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

First manual deploy:

```bash
cd /var/www/superclones.cloud
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
sudo chown -R deploy:deploy /var/www/superclones.cloud
```

Test from your Mac:

```bash
ssh -i ~/.ssh/catalogus_deploy deploy@YOUR_VPS_IP "cd /var/www/superclones.cloud && git status"
```

---

## 3. GitHub repository secrets

Until these exist, the **Deploy to production VPS** job is skipped (build still runs).

In GitHub: open your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

(You need **Admin** on the repo to see Settings. Organization repos: secrets may be under the org instead.)

| Secret | Example | Description |
|--------|---------|-------------|
| `VPS_HOST` | `89.116.38.197` or `superclones.cloud` | Server hostname |
| `VPS_USER` | `deploy` | SSH user |
| `VPS_SSH_KEY` | *(full private key)* | Contents of `catalogus_deploy` |
| `VPS_APP_PATH` | `/var/www/superclones.cloud` | **Must exist** on the VPS (git clone). Wrong path → `cd: No such file or directory`. Use `public_html` only if the repo is cloned there. |
| `VPS_SSH_PORT` | `22` | Optional; omit if default |

Paste the **entire** private key for `VPS_SSH_KEY`, including `-----BEGIN ...-----` lines.

---

## 4. How deploy works

Workflow file: `.github/workflows/deploy.yml`

1. **Build check** on GitHub (same as production: `NODE_ENV=production`, site root URL).
2. **SSH deploy** runs on the VPS:
   - `git fetch` + `git reset --hard origin/main` (keeps `.env` — not in git)
   - `scripts/deploy.sh` → `npm ci` → `npm run build` → `systemctl restart catalogus`

Trigger manually: **Actions → Deploy to VPS → Run workflow**.

---

## 5. Git remote on VPS

The VPS clone must use SSH or HTTPS with access to pull from GitHub:

```bash
sudo -u deploy bash -c 'cd /var/www/superclones.cloud && git remote -v'
# HTTPS (public repo):
sudo -u deploy bash -c 'cd /var/www/superclones.cloud && git remote set-url origin https://github.com/Sima-ae/catalogus.git'
```

For a **private** repo, use a deploy key or machine user token on the server.

---

## 6. `public_html` vs where GitHub deploys

**GitHub does not update `public_html` by default.**

Deploy SSH runs in the directory from the **`VPS_APP_PATH`** secret (default in workflow: `/var/www/superclones.cloud`). That is a **git clone + Node.js app**, not your old static/PHP `public_html` folder.

| You are looking at… | What happens |
|---------------------|--------------|
| `…/public_html` in cPanel/FTP | Often **unchanged** — old site files |
| `VPS_APP_PATH` (e.g. `/var/www/superclones.cloud`) | **Updated** on every deploy (`git pull` + build) |

**This app is served by** `npm run start` on port **3000**, with **nginx proxying** `/` to Node (`deploy/nginx-catalogus.conf.example`). The live site does not come from dropping files into `public_html` alone.

### Fix: align path + nginx

**Option A — recommended (separate app directory)**

1. Keep the repo at `/var/www/superclones.cloud` (or similar).
2. Set GitHub secret **`VPS_APP_PATH`** to that exact path.
3. Configure nginx for `superclones.cloud` to **proxy** `/` → `http://127.0.0.1:3000/` (not `root public_html`).
4. Ignore `public_html` for this Next.js app (or use it only for other sites).

**Option B — repo inside `public_html` (Hostinger-style)**

1. SSH in and find the real path, e.g.  
   `/home/YOUR_USER/domains/superclones.cloud/public_html`
2. Clone the app there (once):  
   `git clone https://github.com/Sima-ae/catalogus.git .`
3. Set GitHub secret **`VPS_APP_PATH`** to that **full path**.
4. Still configure the domain to **proxy to port 3000** (or use Hostinger’s Node app feature pointing at this folder).

On the VPS, run:

```bash
cd /var/www/superclones.cloud   # or your VPS_APP_PATH
bash scripts/vps-diagnose.sh
```

In GitHub Actions → latest **Deploy over SSH** log, look for:

```text
==> Deploy directory: /your/actual/path
==> Git commit on server: …
```

That path must match where you expect updates.

---

## 7. Troubleshooting

| Issue | Fix |
|-------|-----|
| `cd: No such file or directory` on deploy | **`VPS_APP_PATH`** points to a folder that does not exist. Run `vps-first-setup.sh` on the VPS or set the secret to your real clone path (e.g. `public_html` after `git clone` there) |
| Files not updating in `public_html` | Deploy targets **`VPS_APP_PATH`**, not `public_html` — see section 6 |
| GitHub deploy green but site unchanged | Nginx still serving `public_html`; switch to proxy → port 3000 |
| `Permission denied (publickey)` | Check `VPS_SSH_KEY`, `VPS_USER`, `authorized_keys` |
| `git fetch` fails | Set `origin` URL; for private repos add deploy key on GitHub |
| Build fails on VPS | Check Node ≥ 18 (`node -v`), RAM (needs ~1GB for build) |
| App 502 after deploy | `sudo systemctl status catalogus` and `journalctl -u catalogus -n 50` |
| Wrong URL paths | `.env` must have `NEXT_PUBLIC_APP_URL=https://superclones.cloud` and empty `NEXT_PUBLIC_BASE_PATH` before `npm run build` |

---

## 8. What is **not** deployed via git

- `.env` — stays only on the server
- `node_modules` / `.next` — rebuilt on each deploy
- Database — run SQL imports manually when schema changes (`db/*.sql`)
