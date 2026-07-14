import type { PricelistRow } from '@/lib/pricelist-db'
import type { PricelistStockStatus } from '@/lib/pricelist-stock-status'

export function rowStockStatus(row: PricelistRow): PricelistStockStatus | null {
  const price = row.seller_unit_price ?? row.display_unit_price
  if (price != null && Number(price) > 0) return null
  return row.seller_stock_status ?? row.display_stock_status ?? null
}

export function editablePriceSeed(row: PricelistRow): string {
  if (rowStockStatus(row)) return ''
  const raw = row.seller_unit_price ?? row.display_unit_price
  if (raw == null || !Number.isFinite(Number(raw))) return ''
  return String(raw)
}

export function parsePriceInput(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export function editableShippingSeed(row: PricelistRow): string {
  const raw = row.seller_shipping_cost ?? row.display_shipping_cost
  if (raw == null || !Number.isFinite(Number(raw))) return ''
  return String(raw)
}
