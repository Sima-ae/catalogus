import { queryDb } from '@/lib/db'
import { markPricelistOutOfStockForProducts } from '@/lib/pricelist-catalog-status-sync'
import { hideSoldOutProductsFromShop } from '@/lib/shop-catalog-cache'
import { fetchHtmlResult } from '@/lib/yupoo/client'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import {
  classifySourcePageAvailability,
  isYupooUnavailableAlbumHtml,
} from '@/lib/yupoo/unavailable'
import { isYupooPasswordGateHtml } from '@/lib/yupoo/session'

/** In-process debounce so image-proxy storms do not hammer UPDATE. */
const recentlyMarked = new Map<string, number>()
const MARK_DEBOUNCE_MS = 10 * 60 * 1000
const CHECK_DEBOUNCE_MS = 30 * 60 * 1000
/** Cap concurrent heavy lookup UPDATEs from image-proxy storms. */
let markLookupInFlight = 0
const MARK_LOOKUP_MAX = 2
const MARK_LOOKUP_QUEUE: Array<() => void> = []

async function withMarkLookupSlot<T>(fn: () => Promise<T>): Promise<T | null> {
  if (markLookupInFlight >= MARK_LOOKUP_MAX) {
    // Drop excess proxy-driven lookups rather than queueing forever (avoids 503s).
    if (MARK_LOOKUP_QUEUE.length > 20) return null
    await new Promise<void>((resolve) => {
      MARK_LOOKUP_QUEUE.push(resolve)
    })
  }
  markLookupInFlight += 1
  try {
    return await fn()
  } finally {
    markLookupInFlight -= 1
    const next = MARK_LOOKUP_QUEUE.shift()
    if (next) next()
  }
}

function peekDebounced(key: string, ttlMs = MARK_DEBOUNCE_MS): boolean {
  const now = Date.now()
  const prev = recentlyMarked.get(key)
  return Boolean(prev && now - prev < ttlMs)
}

function touchDebounced(key: string, ttlMs = MARK_DEBOUNCE_MS): void {
  const now = Date.now()
  recentlyMarked.set(key, now)
  if (recentlyMarked.size > 5_000) {
    for (const [k, at] of Array.from(recentlyMarked.entries())) {
      if (now - at > ttlMs) recentlyMarked.delete(k)
    }
  }
}

/**
 * Mark catalog products sold out (hidden from shop) when the supplier page
 * or Yupoo images are gone. Clears Yupoo image URLs so PDPs don't show
 * the Chinese “no image” placeholder. Syncs platform pricelist OOS rows.
 */
export async function markProductsSoldOutUnavailable(
  productIds: string[],
  reason = 'source_unavailable'
): Promise<{ marked: number; ids: string[] }> {
  const ids = Array.from(new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean)))
  if (!ids.length) return { marked: 0, ids: [] }

  const fresh = ids.filter((id) => !peekDebounced(`id:${id}`))
  if (!fresh.length) return { marked: 0, ids: [] }

  const placeholders = fresh.map(() => '?').join(', ')
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE products
     SET sold_out = 1,
         image_url = CASE
           WHEN COALESCE(source_url, '') LIKE '%yupoo.com%'
             OR COALESCE(image_url, '') LIKE '%yupoo.com%'
             OR COALESCE(image_url, '') LIKE '%/api/yupoo-image%'
           THEN ''
           ELSE image_url
         END,
         gallery_images = CASE
           WHEN COALESCE(source_url, '') LIKE '%yupoo.com%'
             OR COALESCE(image_url, '') LIKE '%yupoo.com%'
             OR COALESCE(image_url, '') LIKE '%/api/yupoo-image%'
             OR COALESCE(gallery_images, '') LIKE '%yupoo.com%'
           THEN NULL
           ELSE gallery_images
         END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id IN (${placeholders})
       AND status IN ('active', 'draft')
       AND (
         COALESCE(sold_out, 0) = 0
         OR (
           COALESCE(sold_out, 0) = 1
           AND (
             COALESCE(image_url, '') LIKE '%yupoo.com%'
             OR COALESCE(image_url, '') LIKE '%/api/yupoo-image%'
             OR COALESCE(gallery_images, '') LIKE '%yupoo.com%'
           )
         )
       )`,
    fresh
  )
  const marked = Number(result?.affectedRows ?? 0)

  // Only debounce after we attempted the UPDATE (success or already clean).
  for (const id of fresh) touchDebounced(`id:${id}`)

  if (marked > 0) {
    try {
      await markPricelistOutOfStockForProducts(fresh)
    } catch {
      // Pricelist sync is best-effort — sold_out already set.
    }
    await hideSoldOutProductsFromShop(fresh)
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
  if (peekDebounced(`src:${url}`)) return { marked: 0, ids: [] }

  let originPath = url
  try {
    const u = new URL(url)
    originPath = `${u.origin}${u.pathname}`
  } catch {
    // keep raw
  }

  const slotted = await withMarkLookupSlot(async () => {
    // Prefer equality / prefix on indexed-friendly source_url — avoid
    // `? LIKE CONCAT(SUBSTRING_INDEX(...))` full scans that exhaust the pool.
    const rows = await queryDb<{ id: string }[]>(
      `SELECT id FROM products
       WHERE status IN ('active', 'draft')
         AND source_url IS NOT NULL
         AND (
           source_url = ?
           OR source_url LIKE CONCAT(?, '?%')
           OR source_url LIKE CONCAT(?, '&%')
         )
         AND (
           COALESCE(sold_out, 0) = 0
           OR COALESCE(image_url, '') LIKE '%yupoo.com%'
           OR COALESCE(gallery_images, '') LIKE '%yupoo.com%'
         )
       LIMIT 50`,
      [url, originPath, originPath]
    )
    return rows.map((r) => String(r.id))
  })
  if (!slotted) return { marked: 0, ids: [] }

  const result = await markProductsSoldOutUnavailable(slotted, reason)
  if (result.ids.length) touchDebounced(`src:${url}`)
  return result
}

export async function markProductsSoldOutByImageUrl(
  imageUrl: string | null | undefined,
  reason = 'yupoo_image_unavailable'
): Promise<{ marked: number; ids: string[] }> {
  const url = String(imageUrl ?? '').trim()
  if (!url) return { marked: 0, ids: [] }
  if (peekDebounced(`img:${url}`)) return { marked: 0, ids: [] }

  const stem = url
    .replace(/\/(large|medium|small|big|thumb|square|origin|original)\.(jpe?g|png|webp|gif)(\?.*)?$/i, '/')
    .replace(/\?.*$/, '')

  const slotted = await withMarkLookupSlot(async () => {
    const rows = await queryDb<{ id: string }[]>(
      `SELECT id FROM products
       WHERE status IN ('active', 'draft')
         AND (
           image_url = ?
           OR image_url LIKE CONCAT(?, '%')
         )
         AND (
           COALESCE(sold_out, 0) = 0
           OR COALESCE(image_url, '') LIKE '%yupoo.com%'
           OR COALESCE(gallery_images, '') LIKE '%yupoo.com%'
         )
       LIMIT 50`,
      [url, stem]
    )
    return rows.map((r) => String(r.id))
  })
  if (!slotted) return { marked: 0, ids: [] }

  const result = await markProductsSoldOutUnavailable(slotted, reason)
  if (result.ids.length) touchDebounced(`img:${url}`)
  return result
}

/**
 * Re-check a Yupoo album URL and mark the product sold out when the album is gone.
 * Debounced per product — safe to call from product page / image proxy.
 */
export async function checkAndMarkYupooSourceUnavailable(
  productId: string,
  sourceUrl: string | null | undefined,
  reason = 'yupoo_source_check'
): Promise<{ marked: boolean; reason?: string }> {
  const id = String(productId || '').trim()
  const url = String(sourceUrl ?? '').trim()
  if (!id || !url || !/yupoo\.com/i.test(url)) return { marked: false }
  if (peekDebounced(`check:${id}`, CHECK_DEBOUNCE_MS)) {
    return { marked: false, reason: 'debounced' }
  }
  // Reserve the check slot up front so concurrent PDP / image-proxy hits
  // do not stampede Yupoo for the same album.
  touchDebounced(`check:${id}`, CHECK_DEBOUNCE_MS)

  try {
    const { status, html } = await fetchHtmlResult(url)
    if (isYupooPasswordGateHtml(html)) {
      return { marked: false, reason: 'password_gate' }
    }

    let imageCount: number | null = null
    if (html && status >= 200 && status < 400) {
      try {
        const albumId = url.match(/\/albums\/(\d+)/i)?.[1] || id
        imageCount = parseAlbumPage(html, url, albumId).images.length
      } catch {
        imageCount = null
      }
    }

    const verdict = classifySourcePageAvailability({
      status,
      html,
      imageCount,
      hostHint: url,
    })

    if (
      verdict.ok &&
      html &&
      isYupooUnavailableAlbumHtml(html)
    ) {
      const result = await markProductsSoldOutUnavailable([id], 'yupoo_album_not_found')
      return { marked: result.marked > 0, reason: 'yupoo_album_not_found' }
    }

    if (!verdict.ok) {
      const result = await markProductsSoldOutUnavailable([id], verdict.reason)
      return { marked: result.marked > 0, reason: verdict.reason }
    }

    return { marked: false, reason: 'available' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (/HTTP\s+404|HTTP\s+410/i.test(message)) {
      const result = await markProductsSoldOutUnavailable([id], 'yupoo_http_gone')
      return { marked: result.marked > 0, reason: 'yupoo_http_gone' }
    }
    return { marked: false, reason: 'check_failed' }
  }
}

/**
 * Active products with no primary image — leftover after image clears without
 * sold_out, or restock without restoring photos (Yupoo / WeCatalog / etc.).
 * Mark them sold_out so they leave the shop grid.
 */
export async function markBlankImageProductsSoldOut(
  limit = 500
): Promise<{ marked: number; ids: string[] }> {
  const rows = await queryDb<{ id: string }[]>(
    `SELECT id FROM products
     WHERE status IN ('active', 'draft')
       AND COALESCE(sold_out, 0) = 0
       AND NULLIF(TRIM(COALESCE(image_url, '')), '') IS NULL
     ORDER BY updated_at ASC
     LIMIT ?`,
    [Math.max(1, Math.min(limit, 2000))]
  )
  const ids = rows.map((r) => String(r.id)).filter(Boolean)
  if (!ids.length) return { marked: 0, ids: [] }
  return markProductsSoldOutUnavailable(ids, 'blank_image')
}

/** @deprecated Prefer markBlankImageProductsSoldOut — kept for callers. */
export async function markBlankImageYupooProductsSoldOut(
  limit = 500
): Promise<{ marked: number; ids: string[] }> {
  return markBlankImageProductsSoldOut(limit)
}

