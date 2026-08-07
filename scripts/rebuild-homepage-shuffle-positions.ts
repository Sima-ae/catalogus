#!/usr/bin/env npx tsx
/**
 * Precompute weighted-random homepage product order in catalog_product_positions.
 * Run nightly via cron: npm run db:rebuild-homepage-shuffle
 *
 * Prefer shop-visible products with a sales price (price > 0) in the pool,
 * then fill with unpriced shop-visible products. Weighted shuffle keeps priced
 * items at the front so homepage page 1 is sales-priced.
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool } from '@/lib/db'
import {
  HOMEPAGE_SHUFFLE_POOL_SIZE,
  HOMEPAGE_SHUFFLE_SCOPE,
  replaceCatalogScopePositions,
} from '@/lib/catalog-positions-db'
import { invalidateCachedNamespace } from '@/lib/server-ttl-cache'
import { SHOP_CATALOG_PAGE_CACHE_NS } from '@/lib/shop-catalog-cache'

const SHOP_VISIBLE_SQL = `
  p.status = 'active'
  AND p.sold_out = 0
  AND p.image_url IS NOT NULL AND p.image_url <> ''`

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

async function main() {
  ensureEnvLoaded()

  console.log(`Rebuilding homepage shuffle scope "${HOMEPAGE_SHUFFLE_SCOPE}"…`)

  const priced = await queryDb<Candidate[]>(
    `SELECT p.id, COALESCE(p.price, 0) AS price
     FROM products p
     WHERE ${SHOP_VISIBLE_SQL}
       AND COALESCE(p.price, 0) > 0
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [HOMEPAGE_SHUFFLE_POOL_SIZE]
  )

  shuffleInPlace(priced)
  const pool: Candidate[] = priced.slice(0, HOMEPAGE_SHUFFLE_POOL_SIZE)

  if (pool.length < HOMEPAGE_SHUFFLE_POOL_SIZE) {
    const need = HOMEPAGE_SHUFFLE_POOL_SIZE - pool.length
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
    console.log('No shop-visible products — cleared shuffle positions.')
    await replaceCatalogScopePositions(HOMEPAGE_SHUFFLE_SCOPE, [])
    return
  }

  const shuffled = weightedShuffle(pool)
  const pricedCount = shuffled.filter((row) => row.price > 0).length
  const written = await replaceCatalogScopePositions(
    HOMEPAGE_SHUFFLE_SCOPE,
    shuffled.map((row) => row.id)
  )

  console.log(
    `Stored ${written} homepage shuffle positions (${pricedCount} priced, ${written - pricedCount} unpriced).`
  )
  invalidateCachedNamespace(SHOP_CATALOG_PAGE_CACHE_NS)
  console.log('Cleared in-process homepage catalog page cache.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => resetDbPool())
