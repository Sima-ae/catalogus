/**
 * One-time: set purchase_price to 0 on all draft (concept) products.
 * Does not change import logic — run manually once.
 *
 *   npm run db:zero-draft-purchase-prices -- --dry-run
 *   npm run db:zero-draft-purchase-prices
 *
 * Or use Admin → Products → "Zero concept purchase prices" after deploy.
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { zeroDraftPurchasePrices } from '../src/lib/zero-draft-purchase-prices'

async function main() {
  ensureEnvLoaded()
  const dryRun = process.argv.includes('--dry-run')

  const result = await zeroDraftPurchasePrices({ dryRun })

  console.log(`Draft (concept) products: ${result.totalDraft}`)
  console.log(
    `${dryRun ? '[dry-run] Would set' : 'Set'} purchase_price = 0 on ${result.totalDraft} draft product(s) (${result.nonZeroBefore} currently non-zero).`
  )
  console.log(
    `${dryRun ? '[dry-run] Would clear' : 'Cleared'} option tier purchase_price on ${result.optionTierUpdates} draft product(s).`
  )
  if (!dryRun) console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
