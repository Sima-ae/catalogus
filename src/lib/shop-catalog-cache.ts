import { invalidateCachedNamespace } from '@/lib/server-ttl-cache'
import { queryDb } from '@/lib/db'

/** Bump suffix when shop visibility rules change so Redis cannot serve stale grids. */
export const SHOP_CATALOG_PAGE_CACHE_NS = 'shop-catalog-page-v6'
export const SHOP_CATALOG_COUNT_CACHE_NS = 'shop-catalog-count-v6'
export const ACTIVE_PRODUCT_TOTAL_CACHE_NS = 'active-product-total-v4'
export const NEW_PRODUCTS_WEEK_TOTAL_CACHE_NS = 'new-products-week-total-v4'
export const PRODUCT_COUNT_BUCKETS_NS = 'product-count-buckets-v6'

/** Bump when menu count rules change (e.g. idsOnly) so Redis cannot serve stale pills. */
export const SHOP_CATEGORY_MENU_CACHE_NS = 'shop-category-menu-v5'
export const SHOP_CATEGORY_NAV_CACHE_NS = 'shop-category-nav-v5'
export const SHOP_SUBCATEGORY_CACHE_NS = 'shop-subcategories-v5'

/** Drop shop listing / count caches so sold_out products disappear immediately. */
export function invalidateShopCatalogCaches(): void {
  invalidateCachedNamespace(SHOP_CATALOG_PAGE_CACHE_NS)
  invalidateCachedNamespace(SHOP_CATALOG_COUNT_CACHE_NS)
  invalidateCachedNamespace(ACTIVE_PRODUCT_TOTAL_CACHE_NS)
  invalidateCachedNamespace(NEW_PRODUCTS_WEEK_TOTAL_CACHE_NS)
  invalidateCachedNamespace(PRODUCT_COUNT_BUCKETS_NS)
  invalidateCachedNamespace(SHOP_CATEGORY_MENU_CACHE_NS)
  invalidateCachedNamespace(SHOP_CATEGORY_NAV_CACHE_NS)
  invalidateCachedNamespace(SHOP_SUBCATEGORY_CACHE_NS)
}

/**
 * Coalesce busts from broken-image / proxy OOS storms — one purge per window
 * instead of wiping Redis on every album death (was a major pagination CPU spike).
 */
let catalogCacheInvalidateTimer: ReturnType<typeof setTimeout> | null = null
const CATALOG_CACHE_INVALIDATE_COALESCE_MS = 20_000

export function scheduleInvalidateShopCatalogCaches(
  delayMs = CATALOG_CACHE_INVALIDATE_COALESCE_MS
): void {
  if (catalogCacheInvalidateTimer) return
  catalogCacheInvalidateTimer = setTimeout(() => {
    catalogCacheInvalidateTimer = null
    invalidateShopCatalogCaches()
  }, delayMs)
}

/** Remove products from precomputed homepage shuffle positions. */
export async function removeProductsFromCatalogPositions(
  productIds: string[]
): Promise<void> {
  const ids = Array.from(new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean)))
  if (!ids.length) return
  const placeholders = ids.map(() => '?').join(', ')
  try {
    await queryDb(
      `DELETE FROM catalog_product_positions WHERE product_id IN (${placeholders})`,
      ids
    )
  } catch {
    // Table may not exist on older DBs
  }
}

/** After marking sold out in the shop: purge positions + coalesce cache wipe. */
export async function hideSoldOutProductsFromShop(productIds: string[]): Promise<void> {
  await removeProductsFromCatalogPositions(productIds)
  scheduleInvalidateShopCatalogCaches()
}
