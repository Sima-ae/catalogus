# Production deploy at site root

## Live URL

**https://superclones.cloud/**

## VPS app directory

**`/var/www/superclones.cloud/`** (filesystem path only — not the public URL)

## Environment (`.env` on server)

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://superclones.cloud` |
| `NEXT_PUBLIC_BASE_PATH` | *(empty or omit)* |

If `NEXT_PUBLIC_BASE_PATH` is omitted, production builds serve at `/` when `NODE_ENV=production`.

## Nginx

Use `nginx-catalogus.conf.example` on the `superclones.cloud` server. Proxy to `http://127.0.0.1:3001/` (port **3000** is `inkoop-autos` on this VPS).

## Local development

Do not set `NEXT_PUBLIC_BASE_PATH` or `NEXT_PUBLIC_APP_URL` — the app stays at `http://localhost:3000/`.

See `deploy/GITHUB_DEPLOY.md` for GitHub Actions → VPS setup.
