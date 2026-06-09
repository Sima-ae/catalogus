/** Suggested default when creating AR Factory import sources (editable in admin). */
export const AR_FACTORY_DEFAULT_SHIPPING_COST = 30

/** Parse optional per-source WooCommerce import shipping cost (EUR). */
export function parseWooImportShippingCost(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}
