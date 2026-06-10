/**
 * Restore platform pricelist purchase prices after bulk shipping €0 created
 * shipping-only stub rows that hid existing seller prices.
 *
 *   npm run db:restore-pricelist-prices-after-shipping
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import {
  removeShippingOnlyStubPriceRows,
  syncAllPlatformPricelistPurchasePrices,
} from '../src/lib/pricelist-db'

async function main() {
  ensureEnvLoaded()
  const { removed } = await removeShippingOnlyStubPriceRows()
  console.log(`Removed ${removed} shipping-only stub row(s) from seller_product_prices.`)
  const { updated } = await syncAllPlatformPricelistPurchasePrices()
  console.log(`Re-synced purchase_price for ${updated} platform pricelist product(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
