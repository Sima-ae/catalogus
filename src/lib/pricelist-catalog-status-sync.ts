import { queryDb } from '@/lib/db'
import { PLATFORM_PRICELIST_OWNER_ID } from '@/lib/pricelist-constants'
import { isCuratedSupplierPricelist } from '@/lib/pricelist-pages-db'

const SYNC_ACTOR = 'catalog-status-sync'
const RESTORE_ACTOR = 'inactive-pricelist-restore'

async function shopCurrency(): Promise<string> {
  const rows = await queryDb<{ value: string }[]>(
    `SELECT value FROM settings WHERE \`key\` = 'currency' LIMIT 1`
  )
  return rows[0]?.value?.trim() || 'EUR'
}

function sellerIdForNewRow(listOwnerId: string, addedByUserId: string): string {
  return isCuratedSupplierPricelist(listOwnerId) ? listOwnerId : addedByUserId
}

/**
 * When catalog status is draft: mark pricelist rows as Uitverkocht (out of stock)
 * so draft imports leave "Met prijs" / missing-price views and appear under Uitverkocht.
 * Inactive products stay on the pricelist with their saved prices.
 */
export async function markPricelistOutOfStockForProducts(
  productIds: string[]
): Promise<{ updated: number; inserted: number }> {
  const ids = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)))
  if (!ids.length) return { updated: 0, inserted: 0 }

  const placeholders = ids.map(() => '?').join(', ')
  const currency = await shopCurrency()

  const updateResult = await queryDb<{ affectedRows?: number }>(
    `UPDATE seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = spp.list_owner_id
     SET spp.unit_price = 0,
         spp.out_of_stock = 1,
         spp.stock_status = 'out',
         spp.currency = ?,
         spp.updated_by = ?,
         spp.updated_at = CURRENT_TIMESTAMP
     WHERE spp.product_id IN (${placeholders})`,
    [currency, SYNC_ACTOR, ...ids]
  )
  const updated = Number(updateResult?.affectedRows ?? 0)

  const missingRows = await queryDb<
    { owner_user_id: string; product_id: string; added_by_user_id: string }[]
  >(
    `SELECT pi.owner_user_id, pi.product_id, pi.added_by_user_id
     FROM pricelist_items pi
     WHERE pi.product_id IN (${placeholders})
       AND NOT EXISTS (
         SELECT 1 FROM seller_product_prices spp
         WHERE spp.list_owner_id = pi.owner_user_id
           AND spp.product_id = pi.product_id
       )`,
    ids
  )

  let inserted = 0
  for (const row of missingRows) {
    const listOwnerId = String(row.owner_user_id)
    const productId = String(row.product_id)
    const sellerId = sellerIdForNewRow(listOwnerId, String(row.added_by_user_id))
    await queryDb(
      `INSERT INTO seller_product_prices
         (list_owner_id, seller_id, product_id, unit_price, currency, updated_by, out_of_stock, stock_status)
       VALUES (?, ?, ?, 0, ?, ?, 1, 'out')
       ON DUPLICATE KEY UPDATE
         unit_price = 0,
         out_of_stock = 1,
         stock_status = 'out',
         currency = VALUES(currency),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`,
      [listOwnerId, sellerId, productId, currency, SYNC_ACTOR]
    )
    inserted++
  }

  await queryDb(
    `UPDATE products p
     SET p.sold_out = 1
     WHERE p.id IN (${placeholders})
       AND EXISTS (
         SELECT 1 FROM pricelist_items pi
         WHERE pi.product_id = p.id
           AND pi.owner_user_id = ?
       )`,
    [...ids, PLATFORM_PRICELIST_OWNER_ID]
  )

  return { updated, inserted }
}

/** Backfill: all draft products currently on a pricelist. */
export async function markPricelistOutOfStockForAllHiddenCatalogProducts(): Promise<{
  productCount: number
  updated: number
  inserted: number
}> {
  const rows = await queryDb<{ id: string }[]>(
    `SELECT DISTINCT p.id
     FROM products p
     INNER JOIN pricelist_items pi ON pi.product_id = p.id
     WHERE p.status = 'draft'`
  )
  const ids = rows.map((r) => String(r.id))
  const { updated, inserted } = await markPricelistOutOfStockForProducts(ids)
  return { productCount: ids.length, updated, inserted }
}

/** Undo catalog-status-sync out-of-stock flags for inactive products (prices are not restored). */
export async function restoreInactiveProductsOnPricelist(): Promise<{ restored: number }> {
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE seller_product_prices spp
     INNER JOIN products p ON p.id = spp.product_id
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = spp.list_owner_id
     SET spp.stock_status = '',
         spp.out_of_stock = 0,
         spp.updated_by = ?,
         spp.updated_at = CURRENT_TIMESTAMP
     WHERE p.status = 'inactive'
       AND spp.updated_by = ?`,
    [RESTORE_ACTOR, SYNC_ACTOR]
  )
  return { restored: Number(result?.affectedRows ?? 0) }
}
