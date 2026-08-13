import { queryDb } from '@/lib/db'
import {
  FEATURED_SHUFFLE_POOL_SIZE,
  FEATURED_SHUFFLE_SCOPE,
  replaceCatalogScopePositions,
} from '@/lib/catalog-positions-db'
import { invalidateCachedNamespace } from '@/lib/server-ttl-cache'
import { SHOP_CATALOG_PAGE_CACHE_NS } from '@/lib/shop-catalog-cache'

const SHOP_VISIBLE_SQL = `
  p.status = 'active'
  AND p.sold_out = 0
  AND p.image_url IS NOT NULL AND p.image_url <> ''
  AND p.featured = 1`

type Candidate = { id: string; price: number }

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = items[i]!
    items[i] = items[j]!
    items[j] = tmp
  }
  return items
}

function weightedShuffle(items: Candidate[]): Candidate[] {
  return [...items].sort((a, b) => {
    const scoreA = a.price > 0 ? Math.random() * 0.55 : 0.55 + Math.random() * 0.45
    const scoreB = b.price > 0 ? Math.random() * 0.55 : 0.55 + Math.random() * 0.45
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.id.localeCompare(b.id)
  })
}

/** Rebuild precomputed shuffle order for featured storefront (1-1.club). */
export async function rebuildFeaturedShufflePositions(): Promise<number> {
  console.log(`Rebuilding featured shuffle scope "${FEATURED_SHUFFLE_SCOPE}"…`)

  const priced = await queryDb<Candidate[]>(
    `SELECT p.id, COALESCE(p.price, 0) AS price
     FROM products p
     WHERE ${SHOP_VISIBLE_SQL}
       AND COALESCE(p.price, 0) > 0
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [FEATURED_SHUFFLE_POOL_SIZE]
  )

  shuffleInPlace(priced)
  const pool: Candidate[] = priced.slice(0, FEATURED_SHUFFLE_POOL_SIZE)

  if (pool.length < FEATURED_SHUFFLE_POOL_SIZE) {
    const need = FEATURED_SHUFFLE_POOL_SIZE - pool.length
    const unpriced = await queryDb<Candidate[]>(
      `SELECT p.id, COALESCE(p.price, 0) AS price
       FROM products p
       WHERE ${SHOP_VISIBLE_SQL}
         AND COALESCE(p.price, 0) <= 0
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [need]
    )
    shuffleInPlace(unpriced)
    pool.push(...unpriced.slice(0, need))
  }

  if (!pool.length) {
    console.log('No featured shop-visible products — cleared featured shuffle positions.')
    await replaceCatalogScopePositions(FEATURED_SHUFFLE_SCOPE, [])
    invalidateCachedNamespace(SHOP_CATALOG_PAGE_CACHE_NS)
    return 0
  }

  const shuffled = weightedShuffle(pool)
  const pricedCount = shuffled.filter((row) => row.price > 0).length
  const written = await replaceCatalogScopePositions(
    FEATURED_SHUFFLE_SCOPE,
    shuffled.map((row) => row.id)
  )

  console.log(
    `Stored ${written} featured shuffle positions (${pricedCount} priced, ${written - pricedCount} unpriced).`
  )
  invalidateCachedNamespace(SHOP_CATALOG_PAGE_CACHE_NS)
  return written
}
