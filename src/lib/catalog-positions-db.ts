import { queryDb } from '@/lib/db'

const TABLE = 'catalog_product_positions'

/** Precomputed weighted-random homepage order (rebuilt nightly). */
export const HOMEPAGE_SHUFFLE_SCOPE = 'global-shuffle'
/** Featured products in the precomputed homepage shuffle pool; catalog total stays full size. */
export const HOMEPAGE_SHUFFLE_POOL_SIZE = 10_000

type GlobalSchema = typeof globalThis & {
  __catalogPositionsTableExists?: Promise<boolean>
  __catalogPositionsScopeExists?: Map<string, Promise<boolean>>
  __catalogPositionsPoolIds?: Map<string, { ids: Set<string>; at: number }>
  __catalogPositionsValidCount?: Map<string, { total: number; at: number }>
}

const POOL_META_TTL_MS = 5 * 60_000

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
       AND p.status = 'active'
       AND p.sold_out = 0
       AND p.image_url IS NOT NULL AND p.image_url <> ''
     WHERE cpp.scope = ?`,
    [scope]
  )
  const total = Number(rows[0]?.total ?? 0)
  g.__catalogPositionsValidCount.set(scope, { total, at: Date.now() })
  return total
}

async function loadPoolProductIdSet(scope: string): Promise<Set<string>> {
  const g = globalThis as GlobalSchema
  if (!g.__catalogPositionsPoolIds) g.__catalogPositionsPoolIds = new Map()
  const cached = g.__catalogPositionsPoolIds.get(scope)
  if (cached && Date.now() - cached.at < POOL_META_TTL_MS) return cached.ids

  const rows = await queryDb<{ id: string }[]>(
    `SELECT product_id AS id FROM ${TABLE} WHERE scope = ?`,
    [scope]
  )
  const ids = new Set(rows.map((row) => String(row.id)))
  g.__catalogPositionsPoolIds.set(scope, { ids, at: Date.now() })
  return ids
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
  g.__catalogPositionsPoolIds?.delete(scope)
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
       AND p.status = 'active'
       AND p.sold_out = 0
       AND p.image_url IS NOT NULL AND p.image_url <> ''
     WHERE cpp.scope = ?
     ORDER BY cpp.position ASC
     LIMIT ? OFFSET ?`,
    [scope, limit, offset]
  )
  return rows.map((row) => String(row.id))
}

/**
 * Newest shop-visible products not in the shuffle pool.
 * Filters pool ids in memory (avoids slow NOT EXISTS anti-join on 100k+ rows).
 */
async function fetchNewestActiveOutsidePool(
  scope: string,
  limit: number,
  skipOutside: number
): Promise<string[]> {
  if (limit <= 0) return []
  const poolIds = await loadPoolProductIdSet(scope)
  const out: string[] = []
  let skipped = 0
  let dbOffset = 0
  // Scan newest products; skip pool members until we have `limit` outside-pool ids.
  for (let attempt = 0; attempt < 30 && out.length < limit; attempt++) {
    const batchSize = Math.min(300, Math.max(80, (skipOutside + limit - out.length) * 2))
    const rows = await queryDb<{ id: string }[]>(
      `SELECT p.id
       FROM products p FORCE INDEX (idx_products_status_created)
       WHERE p.status = 'active'
         AND p.sold_out = 0
         AND p.image_url IS NOT NULL AND p.image_url <> ''
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [batchSize, dbOffset]
    )
    if (!rows.length) break
    dbOffset += rows.length
    for (const row of rows) {
      const id = String(row.id)
      if (poolIds.has(id)) continue
      if (skipped < skipOutside) {
        skipped += 1
        continue
      }
      out.push(id)
      if (out.length >= limit) break
    }
    if (rows.length < batchSize) break
  }
  return out
}

/**
 * Dense homepage pages: pool positions 0..N-1, then newest products outside the pool.
 * Page 1 = offset 0, page 2 = offset 24 → products 25–48, etc.
 */
export async function fetchHomepageShufflePageProductIds(
  scope: string,
  _poolSize: number,
  limit: number,
  offset: number
): Promise<string[]> {
  if (limit <= 0) return []
  if (!(await catalogPositionsExistForScope(scope))) return []

  const validPool = await countValidPrecomputedShuffleProducts(scope)

  if (offset < validPool) {
    const fromPool = await fetchPrecomputedShuffleProductIds(scope, limit, offset)
    if (fromPool.length >= limit) return fromPool.slice(0, limit)

    // Rare: raced sold_out between count and read — pad from outside pool.
    const need = limit - fromPool.length
    const tail = await fetchNewestActiveOutsidePool(scope, need, 0)
    return [...fromPool, ...tail].slice(0, limit)
  }

  return fetchNewestActiveOutsidePool(scope, limit, offset - validPool)
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
