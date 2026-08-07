import { queryDb } from '@/lib/db'

const TABLE = 'catalog_product_positions'

/** Precomputed weighted-random homepage order (rebuilt nightly). */
export const HOMEPAGE_SHUFFLE_SCOPE = 'global-shuffle'
/** Featured products in the precomputed homepage shuffle pool; catalog total stays full size. */
export const HOMEPAGE_SHUFFLE_POOL_SIZE = 10_000

type GlobalSchema = typeof globalThis & {
  __catalogPositionsTableExists?: Promise<boolean>
  __catalogPositionsScopeExists?: Map<string, Promise<boolean>>
}

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
  const rows = await queryDb<{ id: string }[]>(
    `SELECT p.id
     FROM ${TABLE} cpp
     INNER JOIN products p ON p.id = cpp.product_id AND p.status = 'active' AND p.sold_out = 0 AND p.image_url IS NOT NULL AND p.image_url <> ''
     WHERE cpp.scope = ?
     ORDER BY cpp.position ASC
     LIMIT ? OFFSET ?`,
    [scope, limit, offset]
  )
  return rows.map((row) => String(row.id))
}

/** Active catalog products not in the homepage shuffle pool (newest first). */
export async function fetchActiveProductsBeyondShufflePool(
  scope: string,
  limit: number,
  offset: number
): Promise<string[]> {
  if (!(await catalogPositionsTableExists())) return []
  if (limit <= 0) return []
  const rows = await queryDb<{ id: string }[]>(
    `SELECT p.id
     FROM products p FORCE INDEX (idx_products_status_created)
     WHERE p.status = 'active'
       AND p.sold_out = 0
       AND p.image_url IS NOT NULL AND p.image_url <> ''
       AND NOT EXISTS (
         SELECT 1 FROM ${TABLE} cpp
         WHERE cpp.product_id = p.id AND cpp.scope = ?
       )
     ORDER BY p.created_at DESC
     LIMIT ? OFFSET ?`,
    [scope, limit, offset]
  )
  return rows.map((row) => String(row.id))
}

/** Homepage page ids: shuffled pool first, then remaining active products by date.
 *  Always tries to return `limit` ids — skips sold-out/blank gaps in the pool. */
export async function fetchHomepageShufflePageProductIds(
  scope: string,
  poolSize: number,
  limit: number,
  offset: number
): Promise<string[]> {
  if (limit <= 0) return []

  const ids: string[] = []
  const seen = new Set<string>()
  let cursor = Math.max(0, offset)
  let beyondOffset = Math.max(0, cursor - poolSize)

  for (let attempt = 0; attempt < 8 && ids.length < limit; attempt++) {
    const need = limit - ids.length

    if (cursor < poolSize) {
      const batch = await fetchPrecomputedShuffleProductIds(scope, need, cursor)
      if (batch.length) {
        for (const id of batch) {
          if (seen.has(id)) continue
          seen.add(id)
          ids.push(id)
          if (ids.length >= limit) break
        }
        // Joined query OFFSET is over valid rows only — advance by what we consumed.
        cursor += batch.length
        continue
      }
      // No more valid rows left in the pool window — switch to the tail catalog.
      cursor = poolSize
      beyondOffset = 0
    }

    const tail = await fetchActiveProductsBeyondShufflePool(scope, need, beyondOffset)
    if (!tail.length) break
    for (const id of tail) {
      if (seen.has(id)) continue
      seen.add(id)
      ids.push(id)
      if (ids.length >= limit) break
    }
    beyondOffset += tail.length
    if (tail.length < need) break
  }

  return ids.slice(0, limit)
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
