/**
 * Undo accidental bulk €600 pricelist update by a share-link supplier.
 * Removes guest rows at €600; keeps earlier supplier prices (~438 products).
 * Resets purchase_price=600 on affected products, then re-syncs from remaining prices.
 *
 *   npm run db:undo-bulk-pricelist-600 -- --dry-run
 *   npm run db:undo-bulk-pricelist-600
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { queryDb } from '../src/lib/db'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  SELLER_PRICE_LATEST_ROW_ORDER_SQL,
} from '../src/lib/pricelist-constants'

/** Share-link contributor from investigation (bulk €600 on 2026-06-16 ~01:53 CEST). */
const BULK_GUEST_SELLER_ID = '15c7ab80-0008-453f-b991-c12adf697d10'
const BULK_UNIT_PRICE = 600

async function countGuestFilledPrices(): Promise<number> {
  const [row] = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(DISTINCT spp.product_id) AS cnt
     FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     WHERE spp.seller_id = ?
       AND spp.unit_price > 0
       AND COALESCE(spp.stock_status, '') = ''
       AND COALESCE(spp.out_of_stock, 0) = 0`,
    [PLATFORM_PRICELIST_OWNER_ID, BULK_GUEST_SELLER_ID]
  )
  return Number(row?.cnt ?? 0)
}

async function countPlatformFilledPrices(): Promise<number> {
  const [row] = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt
     FROM (
       SELECT spp.product_id,
         ROW_NUMBER() OVER (
           PARTITION BY spp.product_id ORDER BY ${SELLER_PRICE_LATEST_ROW_ORDER_SQL}
         ) AS rn,
         spp.unit_price,
         spp.stock_status,
         spp.out_of_stock
       FROM seller_product_prices spp
       INNER JOIN pricelist_items pi
         ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     ) ranked
     WHERE ranked.rn = 1
       AND ranked.unit_price IS NOT NULL
       AND ranked.unit_price > 0
       AND COALESCE(ranked.stock_status, '') = ''
       AND COALESCE(ranked.out_of_stock, 0) = 0`,
    [PLATFORM_PRICELIST_OWNER_ID]
  )
  return Number(row?.cnt ?? 0)
}

async function main() {
  ensureEnvLoaded()
  const dryRun = process.argv.includes('--dry-run')

  const [toDelete] = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt
     FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     WHERE spp.seller_id = ?
       AND spp.unit_price = ?`,
    [PLATFORM_PRICELIST_OWNER_ID, BULK_GUEST_SELLER_ID, BULK_UNIT_PRICE]
  )

  const [purchaseAt600] = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt
     FROM products p
     INNER JOIN pricelist_items pi
       ON pi.product_id = p.id AND pi.owner_user_id = ?
     WHERE p.purchase_price = ?`,
    [PLATFORM_PRICELIST_OWNER_ID, BULK_UNIT_PRICE]
  )

  const guestFilledBefore = await countGuestFilledPrices()
  const platformFilledBefore = await countPlatformFilledPrices()

  console.log('\n=== Undo bulk pricelist €600 ===\n')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`)
  console.log(`Rows to delete (guest @ €${BULK_UNIT_PRICE}): ${toDelete?.cnt ?? 0}`)
  console.log(`Products with purchase_price = ${BULK_UNIT_PRICE}: ${purchaseAt600?.cnt ?? 0}`)
  console.log(`Guest filled prices now: ${guestFilledBefore}`)
  console.log(`Platform filled prices now (latest row): ${platformFilledBefore}`)

  if (dryRun) {
    const kept = guestFilledBefore - Number(toDelete?.cnt ?? 0)
    console.log(
      `\nAfter restore (estimate): ~${Math.max(0, kept)} guest filled prices remain` +
        ` (expected ~438 from before the bulk).`
    )
    console.log('\nRe-run without --dry-run to apply.')
    return
  }

  const deleteResult = await queryDb<{ affectedRows?: number }>(
    `DELETE spp FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     WHERE spp.seller_id = ?
       AND spp.unit_price = ?`,
    [PLATFORM_PRICELIST_OWNER_ID, BULK_GUEST_SELLER_ID, BULK_UNIT_PRICE]
  )
  const deleted =
    typeof deleteResult === 'object' && deleteResult != null && 'affectedRows' in deleteResult
      ? Number(deleteResult.affectedRows ?? 0)
      : 0
  console.log(`\nDeleted ${deleted} seller_product_prices row(s).`)

  const clearResult = await queryDb<{ affectedRows?: number }>(
    `UPDATE products p
     INNER JOIN pricelist_items pi
       ON pi.product_id = p.id AND pi.owner_user_id = ?
     SET p.purchase_price = 0
     WHERE p.purchase_price = ?`,
    [PLATFORM_PRICELIST_OWNER_ID, BULK_UNIT_PRICE]
  )
  const clearedPurchase =
    typeof clearResult === 'object' && clearResult != null && 'affectedRows' in clearResult
      ? Number(clearResult.affectedRows ?? 0)
      : 0
  console.log(`Reset purchase_price on ${clearedPurchase} product(s) that were €${BULK_UNIT_PRICE}.`)

  const syncResult = await queryDb<{ affectedRows?: number }>(
    `UPDATE products p
     INNER JOIN pricelist_items pi
       ON pi.product_id = p.id AND pi.owner_user_id = ?
     INNER JOIN (
       SELECT product_id, unit_price
       FROM (
         SELECT spp.product_id, spp.unit_price,
           ROW_NUMBER() OVER (
             PARTITION BY spp.product_id ORDER BY ${SELLER_PRICE_LATEST_ROW_ORDER_SQL}
           ) AS rn
         FROM seller_product_prices spp
         WHERE spp.unit_price > 0
           AND COALESCE(spp.stock_status, '') = ''
           AND COALESCE(spp.out_of_stock, 0) = 0
       ) ranked
       WHERE ranked.rn = 1
     ) latest ON latest.product_id = p.id
     SET p.purchase_price = latest.unit_price`,
    [PLATFORM_PRICELIST_OWNER_ID]
  )
  const resynced =
    typeof syncResult === 'object' && syncResult != null && 'affectedRows' in syncResult
      ? Number(syncResult.affectedRows ?? 0)
      : 0
  console.log(`Re-synced purchase_price from remaining pricelist prices: ${resynced} product(s).`)

  const guestFilledAfter = await countGuestFilledPrices()
  const platformFilledAfter = await countPlatformFilledPrices()
  console.log(`\nGuest filled prices after: ${guestFilledAfter}`)
  console.log(`Platform filled prices after: ${platformFilledAfter}`)
  console.log('\nDone.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
