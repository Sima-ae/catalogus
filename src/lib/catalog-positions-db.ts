import { queryDb } from '@/lib/db'

const TABLE = 'catalog_product_positions'

/** Precomputed weighted-random homepage order (rebuilt nightly). */
export const HOMEPAGE_SHUFFLE_SCOPE = 'global-shuffle'
/** Featured products in the precomputed homepage shuffle pool; catalog total stays full size. */
export const HOMEPAGE_SHUFFLE_POOL_SIZE = 10_000

type GlobalSchema = typeof globalThis & {
  __catalogPositionsTableExists?: Promise<boolean>
  __catalogPositionsScopeExists?: Map<string, Promise<boolean>>
  __catalogPositionsValidCount?: Map<string, { total: number; at: number }>
}

const POOL_META_TTL_MS = 5 * 60_000

const SHOP_VISIBLE_PREDICATE = `
  p.status = 'active'
  AND p.sold_out = 0
  AND p.image_url IS NOT NULL AND p.image_url <> ''`

async function catalogPositionsTableExists(): Promise<boolean> {
  const g = globalThis as GlobalSchema
  if (!g.__catalogPositionsTableExists) {
    g.__catalogPositionsTableExists = queryDb<{ cnt: number }[]>(
      `SELECT COUNT(*) AS cnt
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = ?`,
      [TABLE]
    ).then((rows) => Number(rows[0]?.cnt ?? 0) > 0)
  }
  return g.__catalogPositionsTableExists
}

export async function catalogPositionsExistForScope(scope: string): Promise<boolean> {
  const g = globalThis as GlobalSchema
  if (!g.__catalogPositionsScopeExists) {
    g.__catalogPositionsScopeExists = new Map()
  }
  const cached = g.__catalogPositionsScopeExists.get(scope)
  if (cached) return cached

  const pending = (async () => {
    if (!(await catalogPositionsTableExists())) return false
    const rows = await queryDb<{ hit: number }[]>(
      `SELECT 1 AS hit FROM ${TABLE} WHERE scope = ? LIMIT 1`,
      [scope]
    )
    return rows.length > 0
  })()

  g.__catalogPositionsScopeExists.set(scope, pending)
  return pending
}

export async function countPrecomputedShuffleScope(scope: string): Promise<number> {
  if (!(await catalogPositionsExistForScope(scope))) return 0
  const rows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM ${TABLE} WHERE scope = ?`,
    [scope]
  )
  return Number(rows[0]?.total ?? 0)
}

/** How many pool rows still join to a shop-visible product (dense homepage length). */
async function countValidPrecomputedShuffleProducts(scope: string): Promise<number> {
  const g = globalThis as GlobalSchema
  if (!g.__catalogPositionsValidCount) g.__catalogPositionsValidCount = new Map()
  const cached = g.__catalogPositionsValidCount.get(scope)
  if (cached && Date.now() - cached.at < POOL_META_TTL_MS) return cached.total

  if (!(await catalogPositionsTableExists())) return 0
  const rows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total
     FROM ${TABLE} cpp
     INNER JOIN products p ON p.id = cpp.product_id
       AND ${SHOP_VISIBLE_PREDICATE}
     WHERE cpp.scope = ?`,
    [scope]
  )
  const total = Number(rows[0]?.total ?? 0)
  g.__catalogPositionsValidCount.set(scope, { total, at: Date.now() })
  return total
}

export async function saveCatalogProductOrder(
  scope: string,
  productIds: string[],
  page: number,
  pageSize: number
): Promise<void> {
  if (!productIds.length) return
  if (!(await catalogPositionsTableExists())) return

  const base = Math.max(0, (Math.max(1, page) - 1) * pageSize)
  const statements = productIds.map((productId, index) =>
    queryDb(
      `INSERT INTO ${TABLE} (scope, product_id, position)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE position = VALUES(position)`,
      [scope, productId, base + index]
    )
  )
  await Promise.all(statements)
}

/** Replace all positions for a scope in one transaction-friendly batch. */
export async function replaceCatalogScopePositions(
  scope: string,
  productIds: string[]
): Promise<number> {
  if (!(await catalogPositionsTableExists())) return 0
  await queryDb(`DELETE FROM ${TABLE} WHERE scope = ?`, [scope])
  if (!productIds.length) return 0

  const g = globalThis as GlobalSchema
  g.__catalogPositionsValidCount?.delete(scope)
  g.__catalogPositionsScopeExists?.delete(scope)

  const batchSize = 500
  let written = 0
  for (let i = 0; i < productIds.length; i += batchSize) {
    const chunk = productIds.slice(i, i + batchSize)
    const values = chunk.map(() => '(?, ?, ?)').join(', ')
    const params: unknown[] = []
    chunk.forEach((productId, index) => {
      params.push(scope, productId, i + index)
    })
    await queryDb(
      `INSERT INTO ${TABLE} (scope, product_id, position) VALUES ${values}`,
      params
    )
    written += chunk.length
  }
  return written
}

/** Read product ids from precomputed shuffle positions (indexed, fast). */
export async function fetchPrecomputedShuffleProductIds(
  scope: string,
  limit: number,
  offset: number
): Promise<string[]> {
  if (!(await catalogPositionsTableExists())) return []
  if (limit <= 0) return []
  const rows = await queryDb<{ id: string }[]>(
    `SELECT p.id
     FROM ${TABLE} cpp
     INNER JOIN products p ON p.id = cpp.product_id
       AND ${SHOP_VISIBLE_PREDICATE}
     WHERE cpp.scope = ?
     ORDER BY cpp.position ASC
     LIMIT ? OFFSET ?`,
    [scope, limit, offset]
  )
  return rows.map((row) => String(row.id))
}

/**
 * Newest shop-visible products by created_at (indexed) — no anti-join.
 * Used to fill/continue homepage pages past the dense shuffle pool without hanging.
 */
async function fetchNewestShopVisibleIds(
  limit: number,
  offset: number
): Promise<string[]> {
  if (limit <= 0) return []
  const rows = await queryDb<{ id: string }[]>(
    `SELECT p.id
     FROM products p FORCE INDEX (idx_products_status_created)
     WHERE ${SHOP_VISIBLE_PREDICATE}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, Math.max(0, offset)]
  )
  return rows.map((row) => String(row.id))
}

function mergeUniqueIds(primary: string[], extra: string[], limit: number): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of primary) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= limit) return out
  }
  for (const id of extra) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
    if (out.length >= limit) return out
  }
  return out
}

/**
 * Dense homepage pages: always aim for exactly `limit` ids (24).
 * Page 1 = offset 0, page 2 = offset 24 → products 25–48, etc.
 *
 * 1) Prefer precomputed shuffle positions (fast join).
 * 2) If the pool is short/exhausted, continue with newest-by-date at the same
 *    absolute offset — never NOT EXISTS / in-memory pool scans (those hung at 88%).
 */
export async function fetchHomepageShufflePageProductIds(
  scope: string,
  _poolSize: number,
  limit: number,
  offset: number
): Promise<string[]> {
  if (limit <= 0) return []
  if (!(await catalogPositionsExistForScope(scope))) {
    return fetchNewestShopVisibleIds(limit, offset)
  }

  const validPool = await countValidPrecomputedShuffleProducts(scope)

  // Still inside the dense pool — over-fetch slightly so sold_out drift rarely shortens pages.
  if (validPool > 0 && offset < validPool) {
    const overFetch = Math.min(limit + 24, Math.max(0, validPool - offset))
    const fromPool = await fetchPrecomputedShuffleProductIds(scope, overFetch, offset)
    if (fromPool.length >= limit) return fromPool.slice(0, limit)

    // End of dense pool on this page — finish with newest-by-date at absolute offset.
    const need = limit - fromPool.length
    const continueAt = offset + fromPool.length
    const tail = await fetchNewestShopVisibleIds(need + 24, continueAt)
    const merged = mergeUniqueIds(fromPool, tail, limit)
    if (merged.length >= limit) return merged

    // Last resort: newest from the top, skipping ids already chosen.
    const head = await fetchNewestShopVisibleIds(limit * 3, 0)
    return mergeUniqueIds(merged, head, limit)
  }

  // Past the dense pool — absolute newest-by-date page (same offset semantics as catalog).
  const page = await fetchNewestShopVisibleIds(limit + 24, offset)
  if (page.length >= limit) return page.slice(0, limit)

  const head = await fetchNewestShopVisibleIds(limit * 3, 0)
  return mergeUniqueIds(page, head, limit)
}

export type CatalogPositionJoin = {
  joinSql: string
  orderSql: string
  scopeParam: string | null
}

/** LEFT JOIN + ORDER BY for scoped manual catalog sort (falls back to created_at). */
export async function catalogPositionJoin(scope: string | null): Promise<CatalogPositionJoin> {
  if (!scope || !(await catalogPositionsTableExists())) {
    return {
      joinSql: '',
      orderSql: 'p.created_at DESC',
      scopeParam: null,
    }
  }

  return {
    joinSql: `LEFT JOIN ${TABLE} cpp ON cpp.product_id = p.id AND cpp.scope = ?`,
    orderSql: 'COALESCE(cpp.position, 999999) ASC, p.created_at DESC',
    scopeParam: scope,
  }
}
