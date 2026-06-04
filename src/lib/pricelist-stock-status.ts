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

export type ResolvedPricelistPrice = {
  unit_price: number | null
  currency: string | null
  stock_status: PricelistStockStatus | null
}

/**
 * Numeric price wins over legacy out_of_stock flags (rows may still have unit_price > 0).
 */
export function resolvePricelistPriceDisplay(input: {
  unit_price: number | string | null | undefined
  currency?: string | null
  out_of_stock?: boolean | number | null
  stock_status?: string | null
}): ResolvedPricelistPrice {
  const unit = Number(input.unit_price)
  const hasPrice = Number.isFinite(unit) && unit > 0
  const currency = input.currency?.trim() || null

  if (hasPrice) {
    return { unit_price: unit, currency, stock_status: null }
  }

  const stock = parsePricelistStockStatus(input.out_of_stock, input.stock_status)
  if (stock) {
    return { unit_price: null, currency, stock_status: stock }
  }

  return { unit_price: null, currency: null, stock_status: null }
}

export function pricelistStockStatusLabel(
  status: PricelistStockStatus | null | undefined,
  t: (key: string) => string
): string {
  if (status === 'out') return t('pricelist.outOfStock')
  if (status === 'temporary') return t('pricelist.temporarilyOutOfStock')
  return ''
}
