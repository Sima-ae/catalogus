#!/usr/bin/env npx tsx
/**
 * Precompute weighted-random order for featured storefront products (1-1.club).
 * Run nightly via cron: npm run db:rebuild-featured-shuffle
 * (Also runs automatically after db:rebuild-homepage-shuffle.)
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { resetDbPool } from '@/lib/db'
import { rebuildFeaturedShufflePositions } from '@/lib/rebuild-featured-shuffle'

async function main() {
  ensureEnvLoaded()
  await rebuildFeaturedShufflePositions()
  console.log('Cleared in-process featured catalog page cache.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => resetDbPool())
