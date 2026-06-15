/**
 * One-time: set purchase_price to 0 on all draft (concept) products.
 * Does not change import logic — run manually once.
 *
 *   npm run db:zero-draft-purchase-prices -- --dry-run
 *   npm run db:zero-draft-purchase-prices
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { queryDb } from '../src/lib/db'
import { parseProductOptions, type ProductOptions } from '../src/lib/product-options'

function zeroOptionPurchasePrices(options: ProductOptions): {
  options: ProductOptions
  changed: boolean
} {
  let changed = false
  const next = options.map((group) => ({
    ...group,
    values: group.values.map((value) => {
      if (value.purchase_price == null || value.purchase_price === 0) return value
      changed = true
      return { ...value, purchase_price: 0 }
    }),
  }))
  return { options: next, changed }
}

async function main() {
  ensureEnvLoaded()
  const dryRun = process.argv.includes('--dry-run')

  const countRows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM products WHERE status = 'draft'`
  )
  const totalDraft = Number(countRows[0]?.total ?? 0)

  const withNonZeroPurchase = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total
     FROM products
     WHERE status = 'draft' AND purchase_price IS NOT NULL AND purchase_price != 0`
  )
  const nonZeroPurchase = Number(withNonZeroPurchase[0]?.total ?? 0)

  const optionRows = await queryDb<{ id: string; product_options: string | null }[]>(
    `SELECT id, product_options
     FROM products
     WHERE status = 'draft'
       AND product_options IS NOT NULL
       AND product_options != ''
       AND product_options != '[]'`
  )

  let optionUpdates = 0
  for (const row of optionRows) {
    const parsed = parseProductOptions(row.product_options)
    if (!parsed) continue
    const { options: cleared, changed } = zeroOptionPurchasePrices(parsed)
    if (!changed) continue
    optionUpdates++
    if (!dryRun) {
      await queryDb(`UPDATE products SET product_options = ? WHERE id = ? AND status = 'draft'`, [
        JSON.stringify(cleared),
        row.id,
      ])
    }
  }

  console.log(`Draft (concept) products: ${totalDraft}`)
  console.log(
    `${dryRun ? '[dry-run] Would set' : 'Set'} purchase_price = 0 on ${totalDraft} draft product(s) (${nonZeroPurchase} currently non-zero).`
  )
  console.log(
    `${dryRun ? '[dry-run] Would clear' : 'Cleared'} option tier purchase_price on ${optionUpdates} draft product(s).`
  )

  if (!dryRun) {
    await queryDb(`UPDATE products SET purchase_price = 0 WHERE status = 'draft'`)
    console.log('Done.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
