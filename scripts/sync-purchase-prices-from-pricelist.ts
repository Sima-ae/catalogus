/**
 * Backfill products.purchase_price from platform pricelist seller prices.
 * Run after enabling pricelist → purchase price sync for existing rows.
 *
 *   npm run db:sync-purchase-prices
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { syncAllPlatformPricelistPurchasePrices } from '../src/lib/pricelist-db'

async function main() {
  ensureEnvLoaded()
  const { updated } = await syncAllPlatformPricelistPurchasePrices()
  console.log(`Synced purchase_price for ${updated} platform pricelist product(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
