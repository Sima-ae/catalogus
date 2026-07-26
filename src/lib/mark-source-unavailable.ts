import { queryDb } from '@/lib/db'
import { markPricelistOutOfStockForProducts } from '@/lib/pricelist-catalog-status-sync'
import { invalidateCachedNamespace } from '@/lib/server-ttl-cache'

const SHOP_CATALOG_COUNT_CACHE_NS = 'shop-catalog-count'
const SHOP_CATALOG_PAGE_CACHE_NS = 'shop-catalog-page'
const ACTIVE_PRODUCT_TOTAL_CACHE_NS = 'active-product-total'
const NEW_PRODUCTS_WEEK_TOTAL_CACHE_NS = 'new-products-week-total'

/** In-process debounce so image-proxy storms do not hammer UPDATE. */
const recentlyMarked = new Map<string, number>()
const MARK_DEBOUNCE_MS = 10 * 60 * 1000

function invalidateShopCatalogCaches(): void {
  invalidateCachedNamespace(SHOP_CATALOG_PAGE_CACHE_NS)
  invalidateCachedNamespace(SHOP_CATALOG_COUNT_CACHE_NS)
  invalidateCachedNamespace(ACTIVE_PRODUCT_TOTAL_CACHE_NS)
  invalidateCachedNamespace(NEW_PRODUCTS_WEEK_TOTAL_CACHE_NS)
}

function shouldSkipDebounced(key: string): boolean {
  const now = Date.now()
  const prev = recentlyMarked.get(key)
  if (prev && now - prev < MARK_DEBOUNCE_MS) return true
  recentlyMarked.set(key, now)
  if (recentlyMarked.size > 5_000) {
    for (const [k, at] of Array.from(recentlyMarked.entries())) {
      if (now - at > MARK_DEBOUNCE_MS) recentlyMarked.delete(k)
    }
  }
  return false
}

/**
 * Mark catalog products sold out (hidden from shop) when the supplier page
 * or Yupoo images are gone. Also syncs platform pricelist out-of-stock rows.
 */
export async function markProductsSoldOutUnavailable(
  productIds: string[],
  reason = 'source_unavailable'
): Promise<{ marked: number; ids: string[] }> {
  const ids = Array.from(new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean)))
  if (!ids.length) return { marked: 0, ids: [] }

  const fresh = ids.filter((id) => !shouldSkipDebounced(`id:${id}`))
  if (!fresh.length) return { marked: 0, ids: [] }

  const placeholders = fresh.map(() => '?').join(', ')
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE products
     SET sold_out = 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id IN (${placeholders})
       AND COALESCE(sold_out, 0) = 0
       AND status IN ('active', 'draft')`,
    fresh
  )
  const marked = Number(result?.affectedRows ?? 0)

    if (marked > 0) {
    try {
      await markPricelistOutOfStockForProducts(fresh)
    } catch {
      // Pricelist sync is best-effort — sold_out already set.
    }
    invalidateShopCatalogCaches()
    if (process.env.SOURCE_UNAVAILABLE_LOG === '1') {
      console.info(
        `[source-unavailable] marked ${marked} product(s) sold_out (${reason}): ${fresh.slice(0, 8).join(',')}${
          fresh.length > 8 ? '…' : ''
        }`
      )
    }
  }

  return { marked, ids: fresh }
}

export async function markProductsSoldOutBySourceUrl(
  sourceUrl: string | null | undefined,
  reason = 'source_url_unavailable'
): Promise<{ marked: number; ids: string[] }> {
  const url = String(sourceUrl ?? '').trim()
  if (!url || !/^https?:\/\//i.test(url)) return { marked: 0, ids: [] }
  if (shouldSkipDebounced(`src:${url}`)) return { marked: 0, ids: [] }

  // Match album with or without query string
  let originPath = url
  try {
    const u = new URL(url)
    originPath = `${u.origin}${u.pathname}`
  } catch {
    // keep raw
  }

  const rows = await queryDb<{ id: string }[]>(
    `SELECT id FROM products
     WHERE COALESCE(sold_out, 0) = 0
       AND status IN ('active', 'draft')
       AND source_url IS NOT NULL
       AND (
         source_url = ?
         OR source_url LIKE CONCAT(?, '%')
         OR ? LIKE CONCAT(SUBSTRING_INDEX(source_url, '?', 1), '%')
       )
     LIMIT 50`,
    [url, originPath, url]
  )
  const ids = rows.map((r) => String(r.id))
  return markProductsSoldOutUnavailable(ids, reason)
}

export async function markProductsSoldOutByImageUrl(
  imageUrl: string | null | undefined,
  reason = 'yupoo_image_unavailable'
): Promise<{ marked: number; ids: string[] }> {
  const url = String(imageUrl ?? '').trim()
  if (!url) return { marked: 0, ids: [] }
  if (shouldSkipDebounced(`img:${url}`)) return { marked: 0, ids: [] }

  // Strip size variant so medium/large/small map to same product
  const stem = url
    .replace(/\/(large|medium|small|big|thumb|square|origin|original)\.(jpe?g|png|webp|gif)(\?.*)?$/i, '/')
    .replace(/\?.*$/, '')

  const rows = await queryDb<{ id: string }[]>(
    `SELECT id FROM products
     WHERE COALESCE(sold_out, 0) = 0
       AND status IN ('active', 'draft')
       AND (
         image_url = ?
         OR image_url LIKE CONCAT(?, '%')
         OR gallery_images LIKE ?
       )
     LIMIT 50`,
    [url, stem, `%${stem}%`]
  )
  const ids = rows.map((r) => String(r.id))
  return markProductsSoldOutUnavailable(ids, reason)
}
