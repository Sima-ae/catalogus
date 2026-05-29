const APP_ORIGIN =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL
    : 'https://superclones.cloud'
  ).replace(/\/$/, '')

/**
 * Public URL for product images on the VPS.
 * Files live on disk under public_html/images/... — URL path is /images/... (no public_html).
 */
export function normalizeProductImageUrl(url: string | null | undefined): string {
  const raw = String(url ?? '').trim()
  if (!raw) return ''

  let path = raw
  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw)
      path = u.pathname + u.search
      if (u.hostname.includes('superclones.cloud')) {
        return normalizeProductImagePath(path, APP_ORIGIN)
      }
      return raw
    } catch {
      return raw
    }
  }

  return normalizeProductImagePath(path, APP_ORIGIN)
}

function normalizeProductImagePath(path: string, origin: string): string {
  let p = path.replace(/\\/g, '/')
  p = p.replace(/^\/?public_html\//i, '/')
  if (!p.startsWith('/')) p = `/${p}`
  if (p.startsWith('/images/')) return `${origin}${p}`
  if (p.startsWith('images/')) return `${origin}/${p}`
  return `${origin}${p}`
}

export function normalizeProductImageList(
  urls: string[] | null | undefined
): string[] | null {
  if (!urls?.length) return null
  const out = urls.map((u) => normalizeProductImageUrl(u)).filter(Boolean)
  return out.length ? out : null
}
