/**
 * Multi-host storefront mode.
 *
 * FEATURED_ONLY_HOSTS=www.1-1.club,1-1.club
 * → shop catalog + PDP only show products.featured = 1 (Uitgelicht).
 *
 * HOST_SITE_BRAND=www.1-1.club:1-1 Club|Tagline,1-1.club:1-1 Club|Tagline
 * → per-host public site_name / site_tagline overrides (settings table is default).
 */

export const CATALOGUS_STORE_HEADER = 'x-catalogus-store'
export const CATALOGUS_STORE_FEATURED = 'featured'

export type CatalogusStoreMode = 'default' | 'featured'

export type HostSiteBrand = {
  site_name: string
  site_tagline?: string
}

function normalizeHostname(hostname: string | null | undefined): string {
  return String(hostname ?? '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '')
}

/** Parse comma-separated host list. */
export function parseFeaturedOnlyHosts(
  raw: string | null | undefined = process.env.FEATURED_ONLY_HOSTS
): string[] {
  const text = String(raw ?? '').trim()
  if (!text) return []
  return text
    .split(',')
    .map((part) => normalizeHostname(part))
    .filter(Boolean)
}

export function isFeaturedOnlyHost(
  hostname: string | null | undefined,
  hosts: string[] = parseFeaturedOnlyHosts()
): boolean {
  const host = normalizeHostname(hostname)
  if (!host || !hosts.length) return false
  return hosts.includes(host)
}

/**
 * Site password gate applies on the main shop only (e.g. superclones.cloud).
 * Featured-only hosts (1-1.club) are public storefronts — no unlock required.
 */
export function siteAccessAppliesToHost(
  hostname: string | null | undefined
): boolean {
  return !isFeaturedOnlyHost(hostname)
}

export function resolveStoreModeFromHost(
  hostname: string | null | undefined
): CatalogusStoreMode {
  return isFeaturedOnlyHost(hostname) ? 'featured' : 'default'
}

/** Prefer middleware header; fall back to Host / X-Forwarded-Host. */
export function resolveStoreModeFromHeaders(
  headers: Headers | { get(name: string): string | null }
): CatalogusStoreMode {
  const flagged = String(headers.get(CATALOGUS_STORE_HEADER) ?? '')
    .trim()
    .toLowerCase()
  if (flagged === CATALOGUS_STORE_FEATURED) return 'featured'

  const host =
    headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    headers.get('host')
  return resolveStoreModeFromHost(host)
}

/**
 * Parse HOST_SITE_BRAND:
 *   www.1-1.club:1-1 Club|Featured picks,1-1.club:1-1 Club|Featured picks
 */
export function parseHostSiteBrandMap(
  raw: string | null | undefined = process.env.HOST_SITE_BRAND
): Map<string, HostSiteBrand> {
  const text = String(raw ?? '').trim()
  const out = new Map<string, HostSiteBrand>()
  if (!text) return out

  for (const part of text.split(',')) {
    const entry = part.trim()
    if (!entry) continue
    const colon = entry.indexOf(':')
    if (colon <= 0) continue
    const host = normalizeHostname(entry.slice(0, colon))
    const rest = entry.slice(colon + 1).trim()
    if (!host || !rest) continue
    const pipe = rest.indexOf('|')
    const site_name = (pipe >= 0 ? rest.slice(0, pipe) : rest).trim()
    const site_tagline = pipe >= 0 ? rest.slice(pipe + 1).trim() : undefined
    if (!site_name) continue
    out.set(host, {
      site_name,
      ...(site_tagline ? { site_tagline } : {}),
    })
  }
  return out
}

export function resolveHostSiteBrand(
  hostname: string | null | undefined,
  map: Map<string, HostSiteBrand> = parseHostSiteBrandMap()
): HostSiteBrand | null {
  const host = normalizeHostname(hostname)
  if (!host || !map.size) return null
  return map.get(host) ?? null
}

/** Prefer connection Host over client-spoofable X-Forwarded-Host. */
export function resolveRequestHostname(
  headers: Headers | { get(name: string): string | null }
): string {
  return normalizeHostname(
    headers.get('host') ||
      headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      ''
  )
}

/** Absolute origin for the current request host (share/OG links). */
export function resolveRequestOrigin(
  headers: Headers | { get(name: string): string | null },
  fallbackOrigin?: string
): string {
  const host = resolveRequestHostname(headers)
  const proto = (
    headers.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https')
  )
    .split(',')[0]
    .trim()
  if (host) return `${proto}://${host}`
  return String(fallbackOrigin || process.env.NEXT_PUBLIC_APP_URL || 'https://superclones.cloud').replace(
    /\/$/,
    ''
  )
}
