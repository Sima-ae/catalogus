import { queryDb } from '@/lib/db'
import { parseProductOptions, type ProductOptions } from '@/lib/product-options'

export type ZeroDraftPurchasePricesResult = {
  totalDraft: number
  nonZeroBefore: number
  optionTierUpdates: number
  applied: boolean
}

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

/** One-time bulk: set purchase_price to 0 on all draft (concept) products. */
export async function zeroDraftPurchasePrices(options?: {
  dryRun?: boolean
}): Promise<ZeroDraftPurchasePricesResult> {
  const dryRun = options?.dryRun === true

  const countRows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM products WHERE status = 'draft'`
  )
  const totalDraft = Number(countRows[0]?.total ?? 0)

  const withNonZeroPurchase = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total
     FROM products
     WHERE status = 'draft' AND purchase_price IS NOT NULL AND purchase_price != 0`
  )
  const nonZeroBefore = Number(withNonZeroPurchase[0]?.total ?? 0)

  const optionRows = await queryDb<{ id: string; product_options: string | null }[]>(
    `SELECT id, product_options
     FROM products
     WHERE status = 'draft'
       AND product_options IS NOT NULL
       AND product_options != ''
       AND product_options != '[]'`
  )

  let optionTierUpdates = 0
  for (const row of optionRows) {
    const parsed = parseProductOptions(row.product_options)
    if (!parsed) continue
    const { options: cleared, changed } = zeroOptionPurchasePrices(parsed)
    if (!changed) continue
    optionTierUpdates++
    if (!dryRun) {
      await queryDb(`UPDATE products SET product_options = ? WHERE id = ? AND status = 'draft'`, [
        JSON.stringify(cleared),
        row.id,
      ])
    }
  }

  if (!dryRun) {
    await queryDb(`UPDATE products SET purchase_price = 0 WHERE status = 'draft'`)
  }

  return {
    totalDraft,
    nonZeroBefore,
    optionTierUpdates,
    applied: !dryRun,
  }
}
