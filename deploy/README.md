# Production deploy at `/catalogus`

The app is built for:

**https://superclones.cloud/catalogus/**

**Auto deploy from GitHub:** see [GITHUB_DEPLOY.md](./GITHUB_DEPLOY.md) (Actions + VPS secrets).

**VPS app directory:** `/var/www/superclones.cloud/catalogus/`

## Environment (VPS)

```bash
cp .env.vps.example .env
# edit secrets, then:
npm ci
npm run build
npm run start
```

Required variables:

| Variable | Production value |
|----------|----------------|
| `NEXT_PUBLIC_BASE_PATH` | `/catalogus` |
| `NEXT_PUBLIC_APP_URL` | `https://superclones.cloud/catalogus` |
| `NODE_ENV` | `production` |

If `NEXT_PUBLIC_BASE_PATH` is omitted, `npm run build` still defaults to `/catalogus` when `NODE_ENV=production`.

## Nginx

Use `nginx-catalogus.conf.example` on the `superclones.cloud` server. Next.js must receive requests with the `/catalogus` prefix (proxy to `http://127.0.0.1:3000/catalogus/`).

## Local development

Run without `NEXT_PUBLIC_BASE_PATH` — the app stays at `http://localhost:3000/`.
