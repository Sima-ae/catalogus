/**
 * Backfill products.shipping_cost = €30 for AR Factory (arfactorywatch.com) Woo imports.
 *
 *   npm run db:set-ar-factory-shipping
 *   npm run db:set-ar-factory-shipping -- --dry-run
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { queryDb } from '../src/lib/db'
import { AR_FACTORY_STORE_HOST } from '../src/lib/woocommerce/ar-factory'
import { AR_FACTORY_DEFAULT_SHIPPING_COST } from '../src/lib/woocommerce/import-shipping'

const SOURCE_URL_PATTERN = `%${AR_FACTORY_STORE_HOST}%`

async function main() {
  ensureEnvLoaded()
  const dryRun = process.argv.includes('--dry-run')

  const countRows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM products WHERE source_url LIKE ?`,
    [SOURCE_URL_PATTERN]
  )
  const total = Number(countRows[0]?.total ?? 0)

  if (total === 0) {
    console.log(`No products matched source_url LIKE '${SOURCE_URL_PATTERN}'.`)
    return
  }

  const samples = await queryDb<{ id: string; name: string; shipping_cost: number | null }[]>(
    `SELECT id, name, shipping_cost
     FROM products
     WHERE source_url LIKE ?
     ORDER BY name ASC
     LIMIT 5`,
    [SOURCE_URL_PATTERN]
  )

  console.log(
    `${dryRun ? '[dry-run] Would update' : 'Updating'} shipping_cost to ${AR_FACTORY_DEFAULT_SHIPPING_COST} for ${total} product(s).`
  )
  for (const row of samples) {
    console.log(`  - ${row.name} (${row.id}) — current: ${row.shipping_cost ?? 'null'}`)
  }
  if (total > samples.length) {
    console.log(`  … and ${total - samples.length} more`)
  }

  if (dryRun) return

  await queryDb(
    `UPDATE products SET shipping_cost = ? WHERE source_url LIKE ?`,
    [AR_FACTORY_DEFAULT_SHIPPING_COST, SOURCE_URL_PATTERN]
  )
  console.log(`Done. Updated ${total} product(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
