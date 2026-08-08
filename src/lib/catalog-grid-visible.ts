import type { Product } from '@/lib/types'

/** Products that should occupy a shop grid cell (image present, not sold out). */
export function isCatalogGridVisibleProduct(
  product: Pick<Product, 'sold_out' | 'image_url'>
): boolean {
  if (product.sold_out) return false
  return Boolean(String(product.image_url ?? '').trim())
}
