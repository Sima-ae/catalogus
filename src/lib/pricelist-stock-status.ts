/** Seller pricelist stock states (no numeric price shown). */
export type PricelistStockStatus = 'out' | 'temporary'

export function isPricelistStockStatus(value: string | null | undefined): value is PricelistStockStatus {
  return value === 'out' || value === 'temporary'
}

export function parsePricelistStockStatus(
  outOfStock: boolean | number | null | undefined,
  stockStatus: string | null | undefined
): PricelistStockStatus | null {
  if (isPricelistStockStatus(stockStatus)) return stockStatus
  if (outOfStock === true || outOfStock === 1) return 'out'
  return null
}

export function pricelistStockStatusLabel(
  status: PricelistStockStatus | null | undefined,
  t: (key: string) => string
): string {
  if (status === 'out') return t('pricelist.outOfStock')
  if (status === 'temporary') return t('pricelist.temporarilyOutOfStock')
  return ''
}
