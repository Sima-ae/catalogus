import { normalizeWooCommercePriceMode, type WooCommercePriceMode } from '@/lib/woocommerce/types'

/** Woo stores where catalog price is supplier cost (purchase price), not shop retail. */
const SUPPLIER_WOO_STORE_HOSTS = new Set([
  'arfactorywatch.com',
  'otwatches.com',
])

export function wooStoreHostname(url: string | null | undefined): string | null {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
      .hostname.trim()
      .toLowerCase()
      .replace(/^www\./, '')
  } catch {
    return null
  }
}

export function isSupplierWooStoreUrl(url: string | null | undefined): boolean {
  const host = wooStoreHostname(url)
  return host != null && SUPPLIER_WOO_STORE_HOSTS.has(host)
}

/** Price mapping for a WooCommerce import source (supplier sites always use purchase price). */
export function resolveWooCommercePriceModeForSource(source: {
  woocommerce_price_mode?: string | null
  woocommerce_store_url?: string | null
}): WooCommercePriceMode {
  if (isSupplierWooStoreUrl(source.woocommerce_store_url)) {
    return 'purchase_price'
  }
  return normalizeWooCommercePriceMode(source.woocommerce_price_mode)
}
