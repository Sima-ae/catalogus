export const AR_FACTORY_STORE_HOST = 'arfactorywatch.com'

function normalizeHost(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/^www\./, '')
}

/** True when the URL is the AR Factory WooCommerce store (site root or product permalink). */
export function isArFactoryWooStoreUrl(url: string | null | undefined): boolean {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return false
  try {
    const host = normalizeHost(
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).hostname
    )
    return host === AR_FACTORY_STORE_HOST
  } catch {
    return false
  }
}
