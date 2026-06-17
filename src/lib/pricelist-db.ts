import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  SELLER_PRICE_LATEST_ROW_ORDER_SQL,
} from '@/lib/pricelist-constants'
import {
  clearScopedPricesForProduct,
  findConflictingCuratedPricelist,
  isCuratedSupplierPricelist,
  listPricelistPages,
  setProductSupplierPricelistId,
} from '@/lib/pricelist-pages-db'
import { hasApprovedSellerAccess } from '@/lib/seller-pricelist-access-db'
import { listPendingEditRequestsForProducts } from '@/lib/seller-price-edit-db'
import { parseProductJsonField, resolveProductBrandDisplay } from '@/lib/product-serialize'
import { resolveProductDisplayImages } from '@/lib/product-image-url'
import {
  isPricelistStockStatus,
  resolvePricelistPriceDisplay,
  type PricelistStockStatus,
} from '@/lib/pricelist-stock-status'
import {
  buildPricelistFilledPriceCountSql,
  buildPricelistListSql,
  buildPricelistMissingCountSql,
  buildPricelistOutOfStockCountSql,
  type PricelistListFilterInput,
  type PricelistListViewer,
} from '@/lib/pricelist-list-query'
import { PRICELIST_PAGE_SIZE, MAX_PRICELIST_PAGE_SIZE } from '@/lib/pricelist-constants'

export type { PricelistStockStatus } from '@/lib/pricelist-stock-status'

export type PricelistRow = {
  item_id: string
  product_id: string
  name: string
  sku: string
  category: string
  category_id: string | null
  brand: string
  image_url: string
  /** Main + gallery images for lightbox (display URLs). */
  gallery_urls: string[]
  created_at: string
  seller_unit_price: number | null
  seller_currency: string | null
  seller_stock_status?: PricelistStockStatus | null
  display_unit_price: number | null
  display_currency: string | null
  display_stock_status?: PricelistStockStatus | null
  /** Seller-only: price saved and locked until super admin approves edit. */
  price_locked?: boolean
  edit_request_pending?: boolean
  can_edit_price?: boolean
  /** Super admin: pending edit requests from sellers for this product row. */
  pending_edit_requests?: Array<{
    id: string
    seller_id: string
    seller_label: string
  }>
  /** User id whose price is shown in the editable field (for super-admin clear). */
  price_seller_id?: string
  /** Product import default (products.shipping_cost). */
  product_shipping_cost?: number | null
  seller_shipping_cost?: number | null
  display_shipping_cost?: number | null
  can_edit_shipping?: boolean
  shipping_seller_id?: string
}

export async function isProductOnPricelist(
  ownerUserId: string,
  productId: string
): Promise<boolean> {
  const rows = await queryDb<{ ok: number }[]>(
    `SELECT 1 AS ok FROM pricelist_items WHERE owner_user_id = ? AND product_id = ? LIMIT 1`,
    [ownerUserId, productId]
  )
  return rows.length > 0
}

const MEMBERSHIP_LOOKUP_CHUNK = 200

/** Batch membership check for catalog grids (one query per chunk). */
export async function listPricelistMemberProductIds(
  ownerUserId: string,
  productIds: string[]
): Promise<Set<string>> {
  const unique = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)))
  if (!unique.length) return new Set()

  const onList = new Set<string>()
  for (let i = 0; i < unique.length; i += MEMBERSHIP_LOOKUP_CHUNK) {
    const chunk = unique.slice(i, i + MEMBERSHIP_LOOKUP_CHUNK)
    const placeholders = chunk.map(() => '?').join(', ')
    const rows = await queryDb<{ product_id: string }[]>(
      `SELECT product_id FROM pricelist_items
       WHERE owner_user_id = ? AND product_id IN (${placeholders})`,
      [ownerUserId, ...chunk]
    )
    for (const row of rows) {
      const id = String(row.product_id ?? '').trim()
      if (id) onList.add(id)
    }
  }
  return onList
}

export async function addPricelistItem(input: {
  ownerUserId: string
  productId: string
  addedByUserId: string
}): Promise<void> {
  const product = await queryDb<{ id: string }[]>(
    `SELECT id FROM products WHERE id = ? AND status = 'active' LIMIT 1`,
    [input.productId]
  )
  if (!product[0]) throw new Error('PRODUCT_NOT_FOUND')

  if (isCuratedSupplierPricelist(input.ownerUserId)) {
    const conflict = await findConflictingCuratedPricelist(
      input.productId,
      input.ownerUserId
    )
    if (conflict) throw new Error('PRICELIST_CONFLICT')
  }

  const id = randomUUID()
  await queryDb(
    `INSERT INTO pricelist_items (id, owner_user_id, product_id, added_by_user_id)
     VALUES (?, ?, ?, ?)`,
    [id, input.ownerUserId, input.productId, input.addedByUserId]
  )

  if (isCuratedSupplierPricelist(input.ownerUserId)) {
    await setProductSupplierPricelistId(input.productId, input.ownerUserId)
  }
}

const PRICELIST_BULK_INSERT_BATCH = 80

/** Add many products to a pricelist; skips duplicates and inactive products. */
export async function bulkAddPricelistItems(input: {
  ownerUserId: string
  productIds: string[]
  addedByUserId: string
}): Promise<{ inserted: number; skipped: number; total: number; conflicts: number }> {
  const unique = Array.from(new Set(input.productIds.map((id) => id.trim()).filter(Boolean)))
  if (!unique.length) return { inserted: 0, skipped: 0, total: 0, conflicts: 0 }

  let inserted = 0
  let activeEligible = 0
  let conflicts = 0
  const isCurated = isCuratedSupplierPricelist(input.ownerUserId)

  for (let i = 0; i < unique.length; i += PRICELIST_BULK_INSERT_BATCH) {
    const batch = unique.slice(i, i + PRICELIST_BULK_INSERT_BATCH)
    const placeholders = batch.map(() => '?').join(', ')
    const activeRows = await queryDb<{ id: string }[]>(
      `SELECT id FROM products WHERE status = 'active' AND id IN (${placeholders})`,
      batch
    )
    if (!activeRows.length) continue

    const eligibleRows: { id: string }[] = []
    for (const row of activeRows) {
      if (isCurated) {
        const conflict = await findConflictingCuratedPricelist(row.id, input.ownerUserId)
        if (conflict) {
          conflicts += 1
          continue
        }
      }
      eligibleRows.push(row)
    }
    if (!eligibleRows.length) continue
    activeEligible += eligibleRows.length

    const tuples: unknown[] = []
    const valueSql: string[] = []
    for (const row of eligibleRows) {
      valueSql.push('(?, ?, ?, ?)')
      tuples.push(randomUUID(), input.ownerUserId, row.id, input.addedByUserId)
    }

    const result = await queryDb<{ affectedRows?: number }>(
      `INSERT IGNORE INTO pricelist_items (id, owner_user_id, product_id, added_by_user_id)
       VALUES ${valueSql.join(', ')}`,
      tuples
    )
    const batchInserted = result?.affectedRows ?? 0
    inserted += batchInserted

    if (isCurated && batchInserted > 0) {
      for (const row of eligibleRows) {
        await setProductSupplierPricelistId(row.id, input.ownerUserId)
      }
    }
  }

  return {
    inserted,
    skipped: Math.max(0, activeEligible - inserted),
    total: unique.length,
    conflicts,
  }
}

/** Copy curated pricelist uitverkocht state onto products.sold_out (admin + shop). */
export async function persistProductSoldOutFromPricelistQuote(
  listOwnerId: string,
  productId: string
): Promise<boolean> {
  const latest = await loadLatestProductPricesMap(listOwnerId, [productId])
  const row = latest.get(productId)
  const status = row?.stock_status ?? null
  if (status !== 'out' && status !== 'temporary') return false
  await queryDb(`UPDATE products SET sold_out = 1 WHERE id = ?`, [productId])
  return true
}

/**
 * Before a row leaves a curated pricelist: keep admin purchase_price (never cleared here)
 * and persist uitverkocht / tijdelijk uitverkocht as products.sold_out.
 */
async function preserveProductFieldsBeforePricelistRemoval(
  ownerUserId: string,
  productId: string
): Promise<void> {
  if (!isCuratedSupplierPricelist(ownerUserId)) return

  const purchasePrice = await resolveLatestNumericPricelistUnitPrice(ownerUserId, productId)
  if (purchasePrice != null) {
    await queryDb(
      `UPDATE products
       SET purchase_price = CASE
         WHEN purchase_price IS NULL OR purchase_price = 0 THEN ?
         ELSE purchase_price
       END
       WHERE id = ?`,
      [purchasePrice, productId]
    )
  }

  await persistProductSoldOutFromPricelistQuote(ownerUserId, productId)
}

export async function removePricelistItem(ownerUserId: string, productId: string): Promise<void> {
  await preserveProductFieldsBeforePricelistRemoval(ownerUserId, productId)
  await queryDb(
    `DELETE FROM pricelist_items WHERE owner_user_id = ? AND product_id = ?`,
    [ownerUserId, productId]
  )
  if (isCuratedSupplierPricelist(ownerUserId)) {
    await setProductSupplierPricelistId(productId, null)
    await clearScopedPricesForProduct(ownerUserId, productId)
  }
}

export async function bulkRemovePricelistItems(
  ownerUserId: string,
  productIds: string[]
): Promise<{ removed: number; failed: number; errors: string[] }> {
  let removed = 0
  const errors: string[] = []

  for (const productId of productIds) {
    try {
      await removePricelistItem(ownerUserId, productId)
      removed += 1
    } catch (itemError) {
      errors.push(
        `${productId}: ${itemError instanceof Error ? itemError.message : 'Failed'}`
      )
    }
  }

  return { removed, failed: errors.length, errors }
}

type SellerPriceRow = {
  unit_price: number
  currency: string
  locked: boolean
  stock_status: PricelistStockStatus | null
  shipping_cost: number | null
}

function mapSellerPriceRow(row: {
  unit_price: string
  currency: string
  locked: number | boolean
  out_of_stock: number | boolean
  stock_status: string | null
  shipping_cost?: string | number | null
}): SellerPriceRow {
  const resolved = resolvePricelistPriceDisplay(row)
  const shippingRaw = row.shipping_cost
  const shippingCost =
    shippingRaw != null && shippingRaw !== ''
      ? Number(shippingRaw)
      : null
  return {
    unit_price: resolved.unit_price ?? 0,
    currency: resolved.currency ?? row.currency,
    locked: row.locked === 1 || row.locked === true,
    stock_status: resolved.stock_status,
    shipping_cost:
      shippingCost != null && Number.isFinite(shippingCost) ? shippingCost : null,
  }
}

export async function getSellerProductPrice(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<SellerPriceRow | null> {
  const rows = await queryDb<
    {
      unit_price: string
      currency: string
      locked: number | boolean
      out_of_stock: number | boolean
      stock_status: string | null
    }[]
  >(
    `SELECT unit_price, currency, COALESCE(locked, 0) AS locked, COALESCE(out_of_stock, 0) AS out_of_stock,
            stock_status, shipping_cost
     FROM seller_product_prices
     WHERE list_owner_id = ? AND seller_id = ? AND product_id = ? LIMIT 1`,
    [listOwnerId, sellerId, productId]
  )
  const row = rows[0]
  if (!row) return null
  return mapSellerPriceRow(row)
}

async function loadSellerProductPricesMap(
  listOwnerId: string,
  sellerId: string,
  productIds: string[]
): Promise<Map<string, SellerPriceRow>> {
  const map = new Map<string, SellerPriceRow>()
  if (!productIds.length) return map

  const placeholders = productIds.map(() => '?').join(', ')
  const rows = await queryDb<
    {
      product_id: string
      unit_price: string
      currency: string
      locked: number | boolean
      out_of_stock: number | boolean
      stock_status: string | null
    }[]
  >(
    `SELECT product_id, unit_price, currency, COALESCE(locked, 0) AS locked,
            COALESCE(out_of_stock, 0) AS out_of_stock, stock_status, shipping_cost
     FROM seller_product_prices
     WHERE list_owner_id = ? AND seller_id = ? AND product_id IN (${placeholders})`,
    [listOwnerId, sellerId, ...productIds]
  )

  for (const row of rows) {
    map.set(row.product_id, mapSellerPriceRow(row))
  }
  return map
}

async function loadBuyerDisplayPricesMap(
  listOwnerId: string,
  productIds: string[]
): Promise<
  Map<
    string,
    { unit_price: number; currency: string; stock_status: PricelistStockStatus | null }
  >
> {
  const map = new Map<
    string,
    { unit_price: number; currency: string; stock_status: PricelistStockStatus | null }
  >()
  if (!productIds.length) return map

  const placeholders = productIds.map(() => '?').join(', ')
  const rows = await queryDb<
    {
      product_id: string
      unit_price: string
      currency: string
      out_of_stock: number | boolean
      stock_status: string | null
    }[]
  >(
    `SELECT ranked.product_id, ranked.unit_price, ranked.currency, ranked.out_of_stock, ranked.stock_status
     FROM (
       SELECT spp.product_id, spp.unit_price, spp.currency, COALESCE(spp.out_of_stock, 0) AS out_of_stock,
              spp.stock_status, spp.updated_at,
              ROW_NUMBER() OVER (PARTITION BY spp.product_id ORDER BY spp.updated_at DESC) AS rn
       FROM seller_pricelist_access spa
       INNER JOIN seller_product_prices spp
         ON spp.seller_id = spa.seller_id
        AND spp.list_owner_id = spa.list_owner_id
        AND spp.product_id IN (${placeholders})
       WHERE spa.list_owner_id = ? AND spa.status = 'approved'
     ) ranked
     WHERE ranked.rn = 1`,
    [...productIds, listOwnerId]
  )

  for (const row of rows) {
    const resolved = resolvePricelistPriceDisplay(row)
    map.set(row.product_id, {
      unit_price: resolved.unit_price ?? 0,
      currency: resolved.currency ?? row.currency,
      stock_status: resolved.stock_status,
    })
  }
  return map
}

async function loadLatestProductPricesMap(
  listOwnerId: string,
  productIds: string[]
): Promise<
  Map<
    string,
    {
      unit_price: number
      currency: string
      seller_id: string
      stock_status: PricelistStockStatus | null
      shipping_cost: number | null
    }
  >
> {
  const map = new Map<
    string,
    {
      unit_price: number
      currency: string
      seller_id: string
      stock_status: PricelistStockStatus | null
      shipping_cost: number | null
    }
  >()
  if (!productIds.length) return map

  const placeholders = productIds.map(() => '?').join(', ')
  const rows = await queryDb<
    {
      product_id: string
      unit_price: string
      currency: string
      seller_id: string
      out_of_stock: number | boolean
      stock_status: string | null
      shipping_cost: string | null
    }[]
  >(
    `SELECT ranked.product_id, ranked.unit_price, ranked.currency, ranked.seller_id,
            ranked.out_of_stock, ranked.stock_status, ranked.shipping_cost
     FROM (
       SELECT product_id, unit_price, currency, seller_id, shipping_cost,
              COALESCE(out_of_stock, 0) AS out_of_stock, stock_status, updated_at,
              ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY ${SELLER_PRICE_LATEST_ROW_ORDER_SQL}) AS rn
       FROM seller_product_prices
       WHERE list_owner_id = ? AND product_id IN (${placeholders})
     ) ranked
     WHERE ranked.rn = 1`,
    [listOwnerId, ...productIds]
  )

  for (const row of rows) {
    const resolved = resolvePricelistPriceDisplay(row)
    const shippingRaw = row.shipping_cost
    const shippingCost =
      shippingRaw != null && shippingRaw !== '' ? Number(shippingRaw) : null
    map.set(row.product_id, {
      unit_price: resolved.unit_price ?? 0,
      currency: resolved.currency ?? row.currency,
      seller_id: row.seller_id,
      stock_status: resolved.stock_status,
      shipping_cost:
        shippingCost != null && Number.isFinite(shippingCost) && shippingCost >= 0
          ? shippingCost
          : null,
    })
  }
  return map
}

function applyResolvedPriceToRowFields(
  resolved: ReturnType<typeof resolvePricelistPriceDisplay>,
  target: {
    sellerUnit: number | null
    sellerCurrency: string | null
    sellerStockStatus: PricelistStockStatus | null
    displayUnit: number | null
    displayCurrency: string | null
    displayStockStatus: PricelistStockStatus | null
  },
  mode: 'seller' | 'display' | 'both'
) {
  if (resolved.unit_price != null && resolved.unit_price > 0) {
    if (mode === 'seller' || mode === 'both') {
      target.sellerUnit = resolved.unit_price
      target.sellerCurrency = resolved.currency
    }
    if (mode === 'display' || mode === 'both') {
      target.displayUnit = resolved.unit_price
      target.displayCurrency = resolved.currency
    }
    return
  }
  if (resolved.stock_status) {
    if (mode === 'seller' || mode === 'both') {
      target.sellerStockStatus = resolved.stock_status
      target.sellerCurrency = resolved.currency
    }
    if (mode === 'display' || mode === 'both') {
      target.displayStockStatus = resolved.stock_status
      target.displayCurrency = resolved.currency
    }
  }
}

async function loadPendingEditRequestsMap(
  sellerId: string,
  listOwnerId: string,
  productIds: string[]
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>()
  if (!productIds.length) return map

  const placeholders = productIds.map(() => '?').join(', ')
  const rows = await queryDb<{ product_id: string }[]>(
    `SELECT product_id FROM seller_price_edit_requests
     WHERE seller_id = ? AND list_owner_id = ? AND status = 'pending'
       AND product_id IN (${placeholders})`,
    [sellerId, listOwnerId, ...productIds]
  )
  for (const row of rows) {
    map.set(row.product_id, true)
  }
  return map
}

export async function upsertSellerProductPrice(input: {
  listOwnerId: string
  sellerId: string
  productId: string
  unitPrice: number
  currency: string
  updatedBy: string
}): Promise<void> {
  await queryDb(
    `INSERT INTO seller_product_prices (list_owner_id, seller_id, product_id, unit_price, currency, updated_by, out_of_stock, stock_status)
     VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
     ON DUPLICATE KEY UPDATE
       unit_price = VALUES(unit_price),
       currency = VALUES(currency),
       updated_by = VALUES(updated_by),
       out_of_stock = 0,
       stock_status = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [
      input.listOwnerId,
      input.sellerId,
      input.productId,
      input.unitPrice,
      input.currency,
      input.updatedBy,
    ]
  )
}

export async function setSellerProductStockStatus(input: {
  listOwnerId: string
  sellerId: string
  productId: string
  stockStatus: PricelistStockStatus
  currency: string
  updatedBy: string
  /** When true, copy uitverkocht onto products.sold_out for admin dashboard. */
  syncProductSoldOut?: boolean
}): Promise<void> {
  if (!isPricelistStockStatus(input.stockStatus)) {
    throw new Error('Invalid stock status')
  }
  await queryDb(
    `INSERT INTO seller_product_prices (list_owner_id, seller_id, product_id, unit_price, currency, updated_by, out_of_stock, stock_status)
     VALUES (?, ?, ?, 0, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       unit_price = 0,
       out_of_stock = 1,
       stock_status = VALUES(stock_status),
       currency = VALUES(currency),
       updated_by = VALUES(updated_by),
       updated_at = CURRENT_TIMESTAMP`,
    [
      input.listOwnerId,
      input.sellerId,
      input.productId,
      input.currency,
      input.updatedBy,
      input.stockStatus,
    ]
  )
  if (input.syncProductSoldOut) {
    await queryDb(`UPDATE products SET sold_out = 1 WHERE id = ?`, [input.productId])
  }
}

export async function upsertSellerProductShippingCost(input: {
  listOwnerId: string
  sellerId: string
  productId: string
  shippingCost: number
  currency: string
  updatedBy: string
}): Promise<void> {
  const existing = await getSellerProductPrice(
    input.listOwnerId,
    input.sellerId,
    input.productId
  )
  if (existing) {
    await queryDb(
      `UPDATE seller_product_prices
       SET shipping_cost = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE list_owner_id = ? AND seller_id = ? AND product_id = ?`,
      [
        input.shippingCost,
        input.updatedBy,
        input.listOwnerId,
        input.sellerId,
        input.productId,
      ]
    )
    return
  }

  const fallbackUnitPrice = await resolveLatestNumericPricelistUnitPrice(
    input.listOwnerId,
    input.productId
  )
  await queryDb(
    `INSERT INTO seller_product_prices (list_owner_id, seller_id, product_id, unit_price, currency, shipping_cost, updated_by, out_of_stock, stock_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL)`,
    [
      input.listOwnerId,
      input.sellerId,
      input.productId,
      fallbackUnitPrice ?? 0,
      input.currency,
      input.shippingCost,
      input.updatedBy,
    ]
  )
}

export async function clearSellerProductShippingCost(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<boolean> {
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE seller_product_prices SET shipping_cost = NULL
     WHERE list_owner_id = ? AND seller_id = ? AND product_id = ? AND shipping_cost IS NOT NULL`,
    [listOwnerId, sellerId, productId]
  )
  const affected =
    typeof result === 'object' && result != null && 'affectedRows' in result
      ? Number(result.affectedRows)
      : 0
  return affected > 0
}

export async function deleteSellerProductPrice(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<boolean> {
  const result = await queryDb<{ affectedRows?: number }>(
    `DELETE FROM seller_product_prices WHERE list_owner_id = ? AND seller_id = ? AND product_id = ?`,
    [listOwnerId, sellerId, productId]
  )
  return (result?.affectedRows ?? 0) > 0
}

/**
 * Products on the platform pricelist whose latest seller price is uitverkocht /
 * tijdelijk uitverkocht — used for storefront sold-out ribbon overlay.
 */
export async function loadPlatformPricelistSoldOutProductIds(
  productIds: string[]
): Promise<Set<string>> {
  const unique = Array.from(new Set(productIds.map((id) => id.trim()).filter(Boolean)))
  if (!unique.length) return new Set()

  const placeholders = unique.map(() => '?').join(', ')
  const onListRows = await queryDb<{ product_id: string }[]>(
    `SELECT product_id FROM pricelist_items
     WHERE owner_user_id = ? AND product_id IN (${placeholders})`,
    [PLATFORM_PRICELIST_OWNER_ID, ...unique]
  )
  const onListIds = onListRows.map((r) => r.product_id)
  if (!onListIds.length) return new Set()

  const latest = await loadLatestProductPricesMap(PLATFORM_PRICELIST_OWNER_ID, onListIds)
  const soldOut = new Set<string>()
  for (const id of onListIds) {
    const row = latest.get(id)
    if (row?.stock_status === 'out' || row?.stock_status === 'temporary') {
      soldOut.add(id)
    }
  }
  return soldOut
}

/** Merge admin sold_out flag with platform pricelist stock status for shop display. */
export async function applyStorefrontSoldOutFromPlatformPricelist<
  T extends { id: string; sold_out?: boolean },
>(products: T[]): Promise<T[]> {
  if (!products.length) return products
  const flags = await loadPlatformPricelistSoldOutProductIds(products.map((p) => p.id))
  if (!flags.size) return products
  return products.map((p) => ({
    ...p,
    sold_out: Boolean(p.sold_out) || flags.has(p.id),
  }))
}

/**
 * Most recent numeric seller price for a product (ignores out-of-stock rows where unit_price is 0).
 * Used to sync admin purchase_price without clearing when a seller marks uitverkocht.
 */
export async function resolveLatestNumericPricelistUnitPrice(
  listOwnerId: string,
  productId: string
): Promise<number | null> {
  const rows = await queryDb<{ unit_price: string }[]>(
    `SELECT unit_price
     FROM seller_product_prices
     WHERE list_owner_id = ? AND product_id = ? AND unit_price > 0
     ORDER BY updated_at DESC
     LIMIT 1`,
    [listOwnerId, productId]
  )
  if (!rows[0]) return null
  const price = Number(rows[0].unit_price)
  return Number.isFinite(price) && price > 0 ? price : null
}

/**
 * Keep products.purchase_price in sync with curated pricelist seller prices
 * (admin products table “Purchase price” / Inkoopprijs column).
 */
export async function syncProductPurchasePriceFromPricelist(
  productId: string,
  listOwnerId: string
): Promise<void> {
  if (!isCuratedSupplierPricelist(listOwnerId)) return
  const onList = await isProductOnPricelist(listOwnerId, productId)
  if (!onList) return

  const purchasePrice = await resolveLatestNumericPricelistUnitPrice(listOwnerId, productId)
  if (purchasePrice == null) return

  await queryDb(`UPDATE products SET purchase_price = ? WHERE id = ?`, [
    purchasePrice,
    productId,
  ])
}

/** @deprecated Use syncProductPurchasePriceFromPricelist */
export async function syncProductPurchasePriceFromPlatformPricelist(
  productId: string
): Promise<void> {
  return syncProductPurchasePriceFromPricelist(productId, PLATFORM_PRICELIST_OWNER_ID)
}

/** Most recent seller shipping cost for a product on a list (by updated_at). */
export async function resolveLatestNumericPricelistShippingCost(
  listOwnerId: string,
  productId: string
): Promise<number | null> {
  const rows = await queryDb<{ shipping_cost: string }[]>(
    `SELECT shipping_cost
     FROM seller_product_prices
     WHERE list_owner_id = ? AND product_id = ? AND shipping_cost IS NOT NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
    [listOwnerId, productId]
  )
  if (rows[0]?.shipping_cost == null || rows[0]?.shipping_cost === '') return null
  const cost = Number(rows[0].shipping_cost)
  return Number.isFinite(cost) && cost >= 0 ? cost : null
}

/**
 * Keep products.shipping_cost in sync with curated pricelist seller shipping.
 */
export async function syncProductShippingCostFromPricelist(
  productId: string,
  listOwnerId: string
): Promise<void> {
  if (!isCuratedSupplierPricelist(listOwnerId)) return
  const onList = await isProductOnPricelist(listOwnerId, productId)
  if (!onList) return

  const shippingCost = await resolveLatestNumericPricelistShippingCost(listOwnerId, productId)
  if (shippingCost == null) return

  await queryDb(`UPDATE products SET shipping_cost = ? WHERE id = ?`, [
    shippingCost,
    productId,
  ])
}

/** @deprecated Use syncProductShippingCostFromPricelist */
export async function syncProductShippingCostFromPlatformPricelist(
  productId: string
): Promise<void> {
  return syncProductShippingCostFromPricelist(productId, PLATFORM_PRICELIST_OWNER_ID)
}

/** Backfill shipping_cost for every product on curated pricelists. */
export async function syncAllCuratedPricelistShippingCosts(): Promise<{
  onPricelist: number
  withSavedShipping: number
  updated: number
}> {
  const pages = await listPricelistPages({ activeOnly: true })
  let onPricelist = 0
  let withSavedShipping = 0
  let updated = 0

  for (const page of pages) {
    const result = await syncAllPricelistShippingCostsForOwner(page.id)
    onPricelist += result.onPricelist
    withSavedShipping += result.withSavedShipping
    updated += result.updated
  }

  return { onPricelist, withSavedShipping, updated }
}

async function syncAllPricelistShippingCostsForOwner(listOwnerId: string): Promise<{
  onPricelist: number
  withSavedShipping: number
  updated: number
}> {
  const onListRows = await queryDb<{ product_id: string }[]>(
    `SELECT DISTINCT product_id FROM pricelist_items WHERE owner_user_id = ?`,
    [listOwnerId]
  )
  const onPricelist = onListRows.length

  const savedRows = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(DISTINCT spp.product_id) AS cnt
     FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     WHERE spp.list_owner_id = ? AND spp.shipping_cost IS NOT NULL`,
    [listOwnerId, listOwnerId]
  )
  const withSavedShipping = Number(savedRows[0]?.cnt ?? 0)

  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE products p
     INNER JOIN (
       SELECT product_id, shipping_cost
       FROM (
         SELECT product_id, shipping_cost,
           ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY ${SELLER_PRICE_LATEST_ROW_ORDER_SQL}) AS rn
         FROM seller_product_prices
         WHERE list_owner_id = ? AND shipping_cost IS NOT NULL
       ) ranked
       WHERE rn = 1
     ) sp ON sp.product_id = p.id
     INNER JOIN pricelist_items pi
       ON pi.product_id = p.id AND pi.owner_user_id = ?
     SET p.shipping_cost = sp.shipping_cost`,
    [listOwnerId, listOwnerId]
  )
  const updated =
    typeof result === 'object' && result != null && 'affectedRows' in result
      ? Number(result.affectedRows ?? 0)
      : 0

  return { onPricelist, withSavedShipping, updated }
}

/** @deprecated Use syncAllCuratedPricelistShippingCosts */
export async function syncAllPlatformPricelistShippingCosts(): Promise<{
  onPricelist: number
  withSavedShipping: number
  updated: number
}> {
  return syncAllPricelistShippingCostsForOwner(PLATFORM_PRICELIST_OWNER_ID)
}

/**
 * Remove shipping-only stub rows that hid an existing seller price after bulk shipping €0.
 * Safe when another row for the same product still has unit_price > 0.
 */
export async function removeShippingOnlyStubPriceRows(): Promise<{ removed: number }> {
  const result = await queryDb<{ affectedRows?: number }>(
    `DELETE spp FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     WHERE spp.unit_price <= 0
       AND spp.shipping_cost IS NOT NULL
       AND spp.list_owner_id = ?
       AND COALESCE(spp.stock_status, '') = ''
       AND COALESCE(spp.out_of_stock, 0) = 0
       AND EXISTS (
         SELECT 1 FROM seller_product_prices other
         WHERE other.list_owner_id = spp.list_owner_id
           AND other.product_id = spp.product_id
           AND other.unit_price > 0
       )`,
    [PLATFORM_PRICELIST_OWNER_ID, PLATFORM_PRICELIST_OWNER_ID]
  )
  const removed =
    typeof result === 'object' && result != null && 'affectedRows' in result
      ? Number(result.affectedRows ?? 0)
      : 0
  return { removed }
}

/** Backfill purchase_price for every product on curated pricelists. */
export async function syncAllCuratedPricelistPurchasePrices(): Promise<{ updated: number }> {
  const pages = await listPricelistPages({ activeOnly: true })
  let updated = 0
  for (const page of pages) {
    const result = await syncAllPricelistPurchasePricesForOwner(page.id)
    updated += result.updated
  }
  return { updated }
}

async function syncAllPricelistPurchasePricesForOwner(
  listOwnerId: string
): Promise<{ updated: number }> {
  const rows = await queryDb<{ product_id: string }[]>(
    `SELECT DISTINCT product_id FROM pricelist_items WHERE owner_user_id = ?`,
    [listOwnerId]
  )
  for (const row of rows) {
    await syncProductPurchasePriceFromPricelist(row.product_id, listOwnerId)
  }
  return { updated: rows.length }
}

/** @deprecated Use syncAllCuratedPricelistPurchasePrices */
export async function syncAllPlatformPricelistPurchasePrices(): Promise<{ updated: number }> {
  return syncAllPricelistPurchasePricesForOwner(PLATFORM_PRICELIST_OWNER_ID)
}

type PricelistProductItemRow = {
  item_id: string
  product_id: string
  name: string
  sku: string
  category: string | null
  category_id: string | null
  brand: string | null
  brand_id: string | null
  resolved_brand_name: string | null
  shipping_cost: number | string | null
  image_url: string
  gallery_images: unknown
  source_url: string | null
  created_at: string
}

export type PricelistPageResult = {
  items: PricelistRow[]
  total: number
  /** Total rows on this pricelist (no filters). */
  totalOnPricelist: number
  page: number
  pageSize: number
  totalPages: number
  missingPriceCount: number
  exportFilledCount: number
  outOfStockCount: number
}

const PRICELIST_LIST_FROM = `
FROM pricelist_items pi
INNER JOIN products p ON p.id = pi.product_id
LEFT JOIN brands b ON b.active = 1 AND p.brand_id IS NOT NULL AND b.id = p.brand_id`

const PRICELIST_ITEM_SELECT = `SELECT pi.id AS item_id, p.id AS product_id, p.name, p.sku, p.category, p.category_id, p.brand,
            p.brand_id, b.name AS resolved_brand_name,
            p.shipping_cost, p.image_url, p.gallery_images, p.source_url, pi.created_at`

async function fetchPricelistProductItems(
  listOwnerId: string,
  sqlFragment: { joins: string; whereSql: string; params: unknown[] },
  options: { limit?: number; offset?: number }
): Promise<PricelistProductItemRow[]> {
  const limitSql =
    options.limit != null ? ` LIMIT ${Math.max(1, Math.floor(options.limit))}` : ''
  const offsetSql =
    options.offset != null ? ` OFFSET ${Math.max(0, Math.floor(options.offset))}` : ''

  return queryDb<PricelistProductItemRow[]>(
    `${PRICELIST_ITEM_SELECT}
     ${PRICELIST_LIST_FROM}
     ${sqlFragment.joins}
     ${sqlFragment.whereSql}
     ORDER BY pi.created_at DESC${limitSql}${offsetSql}`,
    sqlFragment.params
  )
}

async function countPricelistProductItems(
  sqlFragment: { joins: string; whereSql: string; params: unknown[] }
): Promise<number> {
  const rows = await queryDb<{ total: number }[]>(
    `SELECT COUNT(DISTINCT pi.id) AS total
     ${PRICELIST_LIST_FROM}
     ${sqlFragment.joins}
     ${sqlFragment.whereSql}`,
    sqlFragment.params
  )
  return Number(rows[0]?.total ?? 0)
}

/** Product IDs for bulk “select all” (same filters as the list UI, no hydration). */
export async function listPricelistProductIds(
  listOwnerId: string,
  viewer: PricelistListViewer,
  filters: PricelistListFilterInput,
  maxIds: number
): Promise<string[]> {
  const limit = Math.max(1, Math.floor(maxIds))
  const sqlFragment = buildPricelistListSql(listOwnerId, viewer, filters)
  const rows = await queryDb<{ product_id: string }[]>(
    `SELECT DISTINCT p.id AS product_id
     ${PRICELIST_LIST_FROM}
     ${sqlFragment.joins}
     ${sqlFragment.whereSql}
     ORDER BY pi.created_at DESC
     LIMIT ${limit}`,
    sqlFragment.params
  )
  return rows.map((r) => r.product_id)
}

async function hydratePricelistRows(
  items: PricelistProductItemRow[],
  listOwnerId: string,
  viewer: PricelistListViewer
): Promise<PricelistRow[]> {
  const rows: PricelistRow[] = []
  const productIds = items.map((i) => i.product_id)

  const [
    pendingByProduct,
    sellerPrices,
    buyerDisplayPrices,
    latestPrices,
    sellerPendingEdits,
    adminOwnPrices,
  ] = await Promise.all([
    viewer.role === 'admin' && isCuratedSupplierPricelist(listOwnerId)
      ? listPendingEditRequestsForProducts(listOwnerId, productIds).then(groupPendingByProduct)
      : Promise.resolve(new Map<string, PricelistRow['pending_edit_requests']>()),
    viewer.role === 'seller' || (viewer.role === 'guest' && viewer.userId)
      ? loadSellerProductPricesMap(listOwnerId, viewer.userId, productIds)
      : Promise.resolve(new Map<string, SellerPriceRow>()),
    viewer.role === 'buyer' && listOwnerId === viewer.userId
      ? loadBuyerDisplayPricesMap(listOwnerId, productIds)
      : viewer.role === 'guest'
        ? loadBuyerDisplayPricesMap(listOwnerId, productIds)
        : Promise.resolve(
            new Map<
              string,
              { unit_price: number; currency: string; stock_status: PricelistStockStatus | null }
            >()
          ),
    (viewer.role === 'admin' || viewer.role === 'guest') &&
    isCuratedSupplierPricelist(listOwnerId)
      ? loadLatestProductPricesMap(listOwnerId, productIds)
      : Promise.resolve(
          new Map<
            string,
            {
              unit_price: number
              currency: string
              seller_id: string
              stock_status: PricelistStockStatus | null
              shipping_cost: number | null
            }
          >()
        ),
    viewer.role === 'seller'
      ? loadPendingEditRequestsMap(viewer.userId, listOwnerId, productIds)
      : Promise.resolve(new Map<string, boolean>()),
    viewer.role === 'admin' && isCuratedSupplierPricelist(listOwnerId)
      ? loadSellerProductPricesMap(listOwnerId, viewer.userId, productIds)
      : Promise.resolve(new Map<string, SellerPriceRow>()),
  ])

  for (const item of items) {
    let sellerUnit: number | null = null
    let sellerCurrency: string | null = null
    let sellerStockStatus: PricelistStockStatus | null = null
    let displayUnit: number | null = null
    let displayCurrency: string | null = null
    let displayStockStatus: PricelistStockStatus | null = null

    let priceLocked: boolean | undefined
    let editRequestPending: boolean | undefined
    let canEditPrice: boolean | undefined
    let priceSellerId: string | undefined

    const productShippingCost =
      item.shipping_cost != null && item.shipping_cost !== ''
        ? Number(item.shipping_cost)
        : null
    let sellerShipping: number | null = null
    let displayShipping: number | null = null
    let canEditShipping: boolean | undefined
    let shippingSellerId: string | undefined

    const rowPriceTarget = {
      sellerUnit,
      sellerCurrency,
      sellerStockStatus,
      displayUnit,
      displayCurrency,
      displayStockStatus,
    }

    if (viewer.role === 'seller') {
      priceSellerId = viewer.userId
      const sp = sellerPrices.get(item.product_id)
      if (sp) {
        applyResolvedPriceToRowFields(
          resolvePricelistPriceDisplay({
            unit_price: sp.unit_price,
            currency: sp.currency,
            stock_status: sp.stock_status,
          }),
          rowPriceTarget,
          'both'
        )
        const hasSavedPrice =
          (rowPriceTarget.sellerUnit != null && rowPriceTarget.sellerUnit > 0) ||
          rowPriceTarget.sellerStockStatus != null
        if (hasSavedPrice) {
          priceLocked = true
          canEditPrice = false
        } else {
          canEditPrice = true
        }
      } else {
        canEditPrice = true
      }
      if (sellerPendingEdits.get(item.product_id)) {
        editRequestPending = true
      }
      shippingSellerId = viewer.userId
      const spShip = sellerPrices.get(item.product_id)
      if (spShip?.shipping_cost != null) {
        sellerShipping = spShip.shipping_cost
        canEditShipping = false
      } else {
        canEditShipping = true
      }
    } else if (viewer.role === 'buyer' && listOwnerId === viewer.userId) {
      const dp = buyerDisplayPrices.get(item.product_id)
      if (dp) {
        applyResolvedPriceToRowFields(
          resolvePricelistPriceDisplay(dp),
          rowPriceTarget,
          'display'
        )
      }
      if (productShippingCost != null) {
        displayShipping = productShippingCost
      }
    } else if (viewer.role === 'guest') {
      if (viewer.userId) {
        priceSellerId = viewer.userId
        shippingSellerId = viewer.userId
        const sp = sellerPrices.get(item.product_id)
        if (sp) {
          applyResolvedPriceToRowFields(
            resolvePricelistPriceDisplay({
              unit_price: sp.unit_price,
              currency: sp.currency,
              stock_status: sp.stock_status,
            }),
            rowPriceTarget,
            'seller'
          )
          if (sp.shipping_cost != null) {
            sellerShipping = sp.shipping_cost
          }
        }
      }

      if (isCuratedSupplierPricelist(listOwnerId)) {
        const latest = latestPrices.get(item.product_id)
        if (latest) {
          applyResolvedPriceToRowFields(
            resolvePricelistPriceDisplay(latest),
            rowPriceTarget,
            'display'
          )
          if (latest.shipping_cost != null) {
            displayShipping = latest.shipping_cost
          }
        }
        canEditPrice = true
        canEditShipping = true
      } else {
        const dp = buyerDisplayPrices.get(item.product_id)
        if (dp) {
          applyResolvedPriceToRowFields(
            resolvePricelistPriceDisplay(dp),
            rowPriceTarget,
            'display'
          )
        }
        canEditPrice = true
        canEditShipping = true
      }
    } else if (viewer.role === 'admin' && isCuratedSupplierPricelist(listOwnerId)) {
      canEditPrice = true
      canEditShipping = true
      const own = adminOwnPrices.get(item.product_id)
      if (own) {
        applyResolvedPriceToRowFields(
          resolvePricelistPriceDisplay({
            unit_price: own.unit_price,
            currency: own.currency,
            stock_status: own.stock_status,
          }),
          rowPriceTarget,
          'seller'
        )
        priceSellerId = viewer.userId
        if (own.shipping_cost != null) {
          sellerShipping = own.shipping_cost
          shippingSellerId = viewer.userId
        }
      }
      const latest = latestPrices.get(item.product_id)
      if (latest) {
        applyResolvedPriceToRowFields(
          resolvePricelistPriceDisplay(latest),
          rowPriceTarget,
          'display'
        )
        if (!priceSellerId) {
          priceSellerId = latest.seller_id
        }
        if (latest.shipping_cost != null) {
          displayShipping = latest.shipping_cost
          if (!shippingSellerId) {
            shippingSellerId = latest.seller_id
          }
        }
      }
    }

    sellerUnit = rowPriceTarget.sellerUnit
    sellerCurrency = rowPriceTarget.sellerCurrency
    sellerStockStatus = rowPriceTarget.sellerStockStatus
    displayUnit = rowPriceTarget.displayUnit
    displayCurrency = rowPriceTarget.displayCurrency
    displayStockStatus = rowPriceTarget.displayStockStatus

    const gallery = parseProductJsonField(item.gallery_images)
    const { main, gallery: galleryRest } = resolveProductDisplayImages(
      item.image_url,
      gallery,
      item.source_url
    )
    const gallery_urls = main
      ? [main, ...(galleryRest ?? [])]
      : [...(galleryRest ?? [])]

    rows.push({
      item_id: item.item_id,
      product_id: item.product_id,
      name: item.name,
      sku: item.sku,
      category: item.category?.trim() || '—',
      category_id: item.category_id?.trim() || null,
      brand: resolveProductBrandDisplay(item as Record<string, unknown>).trim() || '—',
      product_shipping_cost: productShippingCost,
      seller_shipping_cost: sellerShipping,
      display_shipping_cost: displayShipping,
      can_edit_shipping: canEditShipping,
      shipping_seller_id: shippingSellerId,
      image_url: main,
      gallery_urls,
      created_at: item.created_at,
      seller_unit_price: sellerUnit,
      seller_currency: sellerCurrency,
      seller_stock_status: sellerStockStatus,
      display_unit_price: displayUnit,
      display_currency: displayCurrency,
      display_stock_status: displayStockStatus,
      price_locked: priceLocked,
      edit_request_pending: editRequestPending,
      can_edit_price: canEditPrice,
      pending_edit_requests: pendingByProduct.get(item.product_id),
      price_seller_id: priceSellerId,
    })
  }

  return rows
}

export async function listPricelistRows(
  listOwnerId: string,
  viewer: PricelistListViewer
): Promise<PricelistRow[]> {
  const sqlFragment = buildPricelistListSql(listOwnerId, viewer, {})
  const items = await fetchPricelistProductItems(listOwnerId, sqlFragment, {})
  return hydratePricelistRows(items, listOwnerId, viewer)
}

export async function listPricelistPage(
  listOwnerId: string,
  viewer: PricelistListViewer,
  options: {
    page?: number
    limit?: number
    filters?: PricelistListFilterInput
  }
): Promise<PricelistPageResult> {
  const pageSize = Math.min(
    MAX_PRICELIST_PAGE_SIZE,
    Math.max(1, Math.floor(options.limit ?? PRICELIST_PAGE_SIZE))
  )
  const page = Math.max(1, Math.floor(options.page ?? 1))
  const filters = options.filters ?? {}

  const listSql = buildPricelistListSql(listOwnerId, viewer, filters)
  const offset = (page - 1) * pageSize

  const exportCountSql = buildPricelistFilledPriceCountSql(listOwnerId, viewer, {
    search: filters.search,
    categoryFilter: filters.categoryFilter,
    brand: filters.brand,
  })
  const missingCountSql = buildPricelistMissingCountSql(listOwnerId, viewer)
  const outOfStockCountSql = buildPricelistOutOfStockCountSql(listOwnerId, viewer)

  const baseSql = buildPricelistListSql(listOwnerId, viewer, {})

  const [total, items, exportFilledCount, missingPriceCount, outOfStockCount, totalOnPricelist] =
    await Promise.all([
      countPricelistProductItems(listSql),
      fetchPricelistProductItems(listOwnerId, listSql, { limit: pageSize, offset }),
      exportCountSql
        ? countPricelistProductItems(exportCountSql)
        : Promise.resolve(0),
      missingCountSql
        ? countPricelistProductItems(missingCountSql)
        : Promise.resolve(0),
      outOfStockCountSql
        ? countPricelistProductItems(outOfStockCountSql)
        : Promise.resolve(0),
      countPricelistProductItems(baseSql),
    ])

  const rows = await hydratePricelistRows(items, listOwnerId, viewer)
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)

  return {
    items: rows,
    total,
    totalOnPricelist,
    page: Math.min(page, totalPages),
    pageSize,
    totalPages,
    missingPriceCount,
    exportFilledCount,
    outOfStockCount,
  }
}

/** Export scope — same filters as the list UI but without quick filters and capped. */
export async function listPricelistRowsForExport(
  listOwnerId: string,
  viewer: PricelistListViewer,
  filters: Omit<
    PricelistListFilterInput,
    'missingPricesOnly' | 'filledPricesOnly' | 'outOfStockOnly'
  >,
  maxRows = 5000
): Promise<PricelistRow[]> {
  const sqlFragment = buildPricelistListSql(listOwnerId, viewer, {
    ...filters,
    missingPricesOnly: false,
    filledPricesOnly: false,
    outOfStockOnly: false,
  })
  const items = await fetchPricelistProductItems(listOwnerId, sqlFragment, {
    limit: maxRows,
    offset: 0,
  })
  return hydratePricelistRows(items, listOwnerId, viewer)
}

function groupPendingByProduct(
  requests: Awaited<ReturnType<typeof listPendingEditRequestsForProducts>>
): Map<string, NonNullable<PricelistRow['pending_edit_requests']>> {
  const map = new Map<string, NonNullable<PricelistRow['pending_edit_requests']>>()
  for (const r of requests) {
    const list = map.get(r.product_id) ?? []
    list.push({
      id: r.id,
      seller_id: r.seller_id,
      seller_label: r.seller_label?.trim() || r.seller_id,
    })
    map.set(r.product_id, list)
  }
  return map
}

export function parseUnitPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0 || n > 99999999.99) return null
  return Math.round(n * 100) / 100
}

export async function getViewablePricelistOwnersForSeller(sellerId: string): Promise<
  {
    id: string
    label: string
    kind: 'self' | 'platform' | 'buyer'
  }[]
> {
  const owners: { id: string; label: string; kind: 'self' | 'platform' | 'buyer' }[] = [
    { id: sellerId, label: 'My pricelist', kind: 'self' },
  ]

  const curatedPages = await listPricelistPages({ activeOnly: true })
  for (const page of curatedPages) {
    const ok = await hasApprovedSellerAccess(sellerId, page.id)
    if (ok) {
      owners.push({
        id: page.id,
        label: page.label,
        kind: 'platform',
      })
    }
  }

  const buyers = await queryDb<{ id: string; email: string; name: string | null }[]>(
    `SELECT u.id, u.email, u.name
     FROM seller_pricelist_access spa
     INNER JOIN users u ON u.id = spa.list_owner_id
     WHERE spa.seller_id = ? AND spa.status = 'approved' AND u.role = 'buyer'
     ORDER BY COALESCE(u.name, u.email) ASC`,
    [sellerId]
  )

  const curatedIds = new Set(curatedPages.map((p) => p.id))

  for (const b of buyers) {
    if (curatedIds.has(b.id)) continue
    owners.push({
      id: b.id,
      label: b.name?.trim() || b.email,
      kind: 'buyer',
    })
  }

  return owners
}
