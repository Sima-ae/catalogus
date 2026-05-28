/**
 * Production is served at https://superclones.cloud/catalogus/
 * Local dev runs at http://localhost:3000/ (no base path).
 */

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === '/') return ''
  return value.replace(/\/$/, '')
}

export const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)

export const appOrigin = (
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
).replace(/\/$/, '')

/** Prefix in-app paths (/admin, /api/...) with the production base path. */
export function appPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (!basePath) return normalized
  return `${basePath}${normalized}`
}

/** Absolute URL for redirects, Stripe, emails, etc. */
export function appUrl(path: string = ''): string {
  if (!path) return `${appOrigin}${basePath}`
  return `${appOrigin}${appPath(path)}`
}
