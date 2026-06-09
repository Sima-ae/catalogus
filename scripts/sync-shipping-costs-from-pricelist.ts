/**
 * Backfill products.shipping_cost from platform pricelist seller shipping.
 * Run after enabling pricelist → shipping cost sync for existing rows.
 *
 *   npm run db:sync-shipping-costs
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { syncAllPlatformPricelistShippingCosts } from '../src/lib/pricelist-db'

async function main() {
  ensureEnvLoaded()
  const { updated } = await syncAllPlatformPricelistShippingCosts()
  console.log(`Synced shipping_cost for ${updated} platform pricelist product(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
