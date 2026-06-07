import { appPath } from '@/lib/paths'

/** Apply basePath to relative catalog image URLs (e.g. /api/yupoo-image). */
export function pricelistImageSrc(url: string | null | undefined): string {
  const u = String(url ?? '').trim()
  if (!u) return ''
  if (u.startsWith('/')) return appPath(u)
  return u
}
