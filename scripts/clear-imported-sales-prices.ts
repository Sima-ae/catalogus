/**
 * Clear sales prices on products that have purchase prices (import cost-only workflow).
 * Keeps purchase_price on products and option tiers; sets price / option price to 0.
 *
 *   npm run db:clear-imported-sales-prices
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { queryDb } from '../src/lib/db'
import { parseProductOptions, type ProductOptions } from '../src/lib/product-options'

function clearOptionSalesPrices(options: ProductOptions): {
  options: ProductOptions
  changed: boolean
} {
  let changed = false
  const next = options.map((group) => ({
    ...group,
    values: group.values.map((value) => {
      const hasPurchase =
        value.purchase_price != null &&
        Number.isFinite(value.purchase_price) &&
        value.purchase_price > 0
      if (!hasPurchase) return value
      if (value.price === 0 && (value.original_price == null || value.original_price === 0)) {
        return value
      }
      changed = true
      return { ...value, price: 0, original_price: null }
    }),
  }))
  return { options: next, changed }
}

async function main() {
  ensureEnvLoaded()

  const rows = await queryDb<
    {
      id: string
      price: string | number
      original_price: string | number | null
      purchase_price: string | number | null
      product_options: string | null
    }[]
  >(
    `SELECT id, price, original_price, purchase_price, product_options
     FROM products
     WHERE purchase_price IS NOT NULL AND purchase_price > 0
        OR (product_options IS NOT NULL AND product_options != '' AND product_options != '[]')`
  )

  let updated = 0

  for (const row of rows) {
    const purchasePrice =
      row.purchase_price != null && row.purchase_price !== ''
        ? Number(row.purchase_price)
        : null
    const currentPrice = Number(row.price) || 0
    const currentOriginal =
      row.original_price != null && row.original_price !== ''
        ? Number(row.original_price)
        : null

    const parsedOptions = parseProductOptions(row.product_options)
    const { options: clearedOptions, changed: optionsChanged } = parsedOptions
      ? clearOptionSalesPrices(parsedOptions)
      : { options: null as ProductOptions | null, changed: false }

    const clearProductPrice =
      purchasePrice != null &&
      purchasePrice > 0 &&
      (currentPrice > 0 || (currentOriginal != null && currentOriginal > 0))

    if (!clearProductPrice && !optionsChanged) continue

    const nextPrice = clearProductPrice ? 0 : currentPrice
    const nextOriginal = clearProductPrice ? null : currentOriginal
    const nextOptionsJson =
      optionsChanged && clearedOptions ? JSON.stringify(clearedOptions) : row.product_options

    await queryDb(
      `UPDATE products
       SET price = ?, original_price = ?, product_options = ?
       WHERE id = ?`,
      [nextPrice, nextOriginal, nextOptionsJson, row.id]
    )
    updated++
  }

  console.log(`Cleared sales prices on ${updated} product(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
