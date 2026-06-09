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
  const { onPricelist, withSavedShipping, updated } =
    await syncAllPlatformPricelistShippingCosts()
  console.log(
    `Platform pricelist: ${onPricelist} product(s); ${withSavedShipping} with saved shipping in seller prices; updated ${updated} product row(s).`
  )
  if (withSavedShipping === 0) {
    console.log(
      'No shipping costs found in seller_product_prices — enter shipping on /pricelist first.'
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
