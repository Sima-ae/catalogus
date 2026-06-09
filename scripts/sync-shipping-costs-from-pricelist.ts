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
  const { onPricelist, withPositiveShipping, updated } =
    await syncAllPlatformPricelistShippingCosts()
  console.log(
    `Platform pricelist: ${onPricelist} product(s); ${withPositiveShipping} with shipping > 0 in seller prices; updated ${updated} product row(s).`
  )
  if (withPositiveShipping === 0) {
    console.log(
      'No positive shipping costs found in seller_product_prices — enter shipping on /pricelist first (values of €0 are not synced).'
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
