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
    [scope, limit, Math.max(0, offset)]
  )
  return rows.map((row) => String(row.id))
}

/**
 * Newest shop-visible products by created_at (indexed).
 * Keep offsets small — callers should pass beyond-pool offsets, not huge absolute pages.
 */
export async function fetchNewestShopVisibleIds(
  limit: number,
  offset: number
): Promise<string[]> {
  if (limit <= 0) return []
  // Hard cap: deep OFFSET walks the index and times out / 503s the pool under load.
  const safeOffset = Math.min(Math.max(0, offset), 20_000)
  const rows = await queryDb<{ id: string }[]>(
    `SELECT p.id
     FROM products p FORCE INDEX (idx_products_status_created)
     WHERE ${SHOP_VISIBLE_PREDICATE}
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, safeOffset]
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
 * Live-random first homepage page from the ~10k precomputed pool.
 * RAND() only scans the pool (not the full catalog) — cheap and different each call.
 */
export async function fetchRandomHomepageShuffleProductIds(
  scope: string,
  limit: number
): Promise<string[]> {
  if (limit <= 0) return []
  if (!(await catalogPositionsExistForScope(scope))) {
    // Rare: pool not built yet — random window over newest shop-visible rows.
    const window = Math.max(limit * 40, 2_000)
    const newest = await fetchNewestShopVisibleIds(window, 0)
    if (newest.length <= limit) return newest
    for (let i = newest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = newest[i]!
      newest[i] = newest[j]!
      newest[j] = tmp
    }
    return newest.slice(0, limit)
  }

  const rows = await queryDb<{ id: string }[]>(
    `SELECT p.id
     FROM ${TABLE} cpp
     INNER JOIN products p ON p.id = cpp.product_id
       AND ${SHOP_VISIBLE_PREDICATE}
     WHERE cpp.scope = ?
     ORDER BY RAND()
     LIMIT ?`,
    [scope, Math.min(limit + 24, limit * 2)]
  )
  return rows.map((row) => String(row.id)).filter(Boolean)
}

/**
 * Dense homepage pages — at most 2 SQL round-trips.
 * Page 1 = offset 0 … page N = offset (N-1)*24.
 *
 * Never stacks COUNT + pool + deep absolute OFFSET + head fill (that exhausted the
 * MariaDB pool around page 14–15 and returned HTTP 503).
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

  // Happy path: one indexed pool read (over-fetch so sold_out drift rarely shortens the page).
  const fromPool = await fetchPrecomputedShuffleProductIds(
    scope,
    Math.min(limit + 24, limit * 2),
    offset
  )
  if (fromPool.length >= limit) return fromPool.slice(0, limit)

  if (fromPool.length > 0) {
    // Last partial pool page — pad from newest head (OFFSET 0), one extra query.
    const tail = await fetchNewestShopVisibleIds(limit - fromPool.length + 32, 0)
    return mergeUniqueIds(fromPool, tail, limit)
  }

  // Past the dense pool: continue with a SMALL beyond-pool offset (not absolute page offset).
  const validPool = await countValidPrecomputedShuffleProducts(scope)
  const beyond = Math.max(0, offset - validPool)
  const page = await fetchNewestShopVisibleIds(limit + 24, beyond)
  if (page.length >= limit) return page.slice(0, limit)
  const head = await fetchNewestShopVisibleIds(limit * 3, 0)
  return mergeUniqueIds(page, head, limit)
}

/**
 * Lightweight top-up when a page lost rows to sold_out/blank-image after hydrate.
 * One query only — never re-enter the full shuffle pager.
 */
export async function fillShopVisibleProductIds(
  excludeIds: string[],
  need: number
): Promise<string[]> {
  if (need <= 0) return []
  const exclude = new Set(excludeIds.filter(Boolean))
  // Pull a wide newest window so excludes from the current page don't leave us short.
  const batch = await fetchNewestShopVisibleIds(Math.max(need * 4, 96), 0)
  const out: string[] = []
  for (const id of batch) {
    if (exclude.has(id)) continue
    out.push(id)
    if (out.length >= need) break
  }
  return out
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
