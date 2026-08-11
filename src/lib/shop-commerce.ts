import { isZeroPrice } from '@/lib/format-price'
import type { CatalogusStoreMode } from '@/lib/store-host'

/** Product can be added to cart / paid via Stripe when sales price is > 0. */
export function productIsPurchasable(
  price: number | string | null | undefined
): boolean {
  return !isZeroPrice(price)
}

/**
 * Whether this storefront may show cart / checkout for purchasable products.
 * Featured (1-1.club) always allows checkout; Super Clones respects catalog_mode
 * as an admin kill-switch.
 */
export function storeAllowsCheckout(
  storeMode: CatalogusStoreMode | null | undefined,
  catalogMode: boolean
): boolean {
  if (storeMode === 'featured') return true
  return !catalogMode
}

/** Show Add to cart when the item is priced and the host allows commerce. */
export function showAddToCartCta(
  price: number | string | null | undefined,
  storeMode: CatalogusStoreMode | null | undefined,
  catalogMode: boolean
): boolean {
  return productIsPurchasable(price) && storeAllowsCheckout(storeMode, catalogMode)
}

/** Convert EUR amount to Stripe cents (integer). */
export function eurosToStripeCents(amount: number): number {
  return Math.round(Number(amount) * 100)
}
