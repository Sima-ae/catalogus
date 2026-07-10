#!/usr/bin/env npx tsx
/**
 * Precompute weighted-random homepage product order in catalog_product_positions.
 * Run nightly via cron: npm run db:rebuild-homepage-shuffle
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool } from '@/lib/db'
import {
  HOMEPAGE_SHUFFLE_POOL_SIZE,
  HOMEPAGE_SHUFFLE_SCOPE,
  replaceCatalogScopePositions,
} from '@/lib/catalog-positions-db'
import { invalidateCachedNamespace } from '@/lib/server-ttl-cache'

const SHOP_SHUFFLE_PAGE_CACHE_NS = 'shop-shuffle-page'

type Candidate = { id: string; price: number }

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

  const rows = await queryDb<Candidate[]>(
    `SELECT p.id, COALESCE(p.price, 0) AS price
     FROM products p
     WHERE p.status = 'active'
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [HOMEPAGE_SHUFFLE_POOL_SIZE]
  )

  if (!rows.length) {
    console.log('No active products — cleared shuffle positions.')
    await replaceCatalogScopePositions(HOMEPAGE_SHUFFLE_SCOPE, [])
    return
  }

  const shuffled = weightedShuffle(rows)
  const written = await replaceCatalogScopePositions(
    HOMEPAGE_SHUFFLE_SCOPE,
    shuffled.map((row) => row.id)
  )

  console.log(`Stored ${written} homepage shuffle positions (${rows.length} active products).`)
  invalidateCachedNamespace(SHOP_SHUFFLE_PAGE_CACHE_NS)
  console.log('Cleared in-process homepage shuffle page cache.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => resetDbPool())
