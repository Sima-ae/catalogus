import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'

export type SellerPriceEditRequestRow = {
  id: string
  seller_id: string
  product_id: string
  list_owner_id: string
  status: 'pending' | 'approved' | 'denied'
  requested_at: string
  reviewed_by: string | null
  reviewed_at: string | null
  seller_label?: string
  product_name?: string
  product_sku?: string
}

export async function getSellerPriceLockState(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<{ hasPrice: boolean; locked: boolean }> {
  const rows = await queryDb<{ unit_price: string; locked: number | boolean }[]>(
    `SELECT unit_price, locked FROM seller_product_prices
     WHERE list_owner_id = ? AND seller_id = ? AND product_id = ? LIMIT 1`,
    [listOwnerId, sellerId, productId]
  )
  const row = rows[0]
  if (!row) return { hasPrice: false, locked: false }
  return {
    hasPrice: true,
    locked: row.locked === 1 || row.locked === true,
  }
}

export async function getPendingEditRequest(
  sellerId: string,
  productId: string,
  listOwnerId: string
): Promise<SellerPriceEditRequestRow | null> {
  const rows = await queryDb<SellerPriceEditRequestRow[]>(
    `SELECT id, seller_id, product_id, list_owner_id, status, requested_at, reviewed_by, reviewed_at
     FROM seller_price_edit_requests
     WHERE seller_id = ? AND product_id = ? AND list_owner_id = ? AND status = 'pending'
     LIMIT 1`,
    [sellerId, productId, listOwnerId]
  )
  return rows[0] ?? null
}

export async function createPriceEditRequest(input: {
  sellerId: string
  productId: string
  listOwnerId: string
}): Promise<SellerPriceEditRequestRow> {
  const existing = await getPendingEditRequest(
    input.sellerId,
    input.productId,
    input.listOwnerId
  )
  if (existing) return existing

  const lock = await getSellerPriceLockState(
    input.listOwnerId,
    input.sellerId,
    input.productId
  )
  if (!lock.hasPrice || !lock.locked) {
    throw new Error('PRICE_NOT_LOCKED')
  }

  const id = randomUUID()
  await queryDb(
    `INSERT INTO seller_price_edit_requests (id, seller_id, product_id, list_owner_id, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [id, input.sellerId, input.productId, input.listOwnerId]
  )

  const rows = await queryDb<SellerPriceEditRequestRow[]>(
    `SELECT id, seller_id, product_id, list_owner_id, status, requested_at, reviewed_by, reviewed_at
     FROM seller_price_edit_requests WHERE id = ? LIMIT 1`,
    [id]
  )
  return rows[0]!
}

export async function approvePriceEditRequest(
  requestId: string,
  reviewerId: string
): Promise<SellerPriceEditRequestRow> {
  const rows = await queryDb<SellerPriceEditRequestRow[]>(
    `SELECT id, seller_id, product_id, list_owner_id, status, requested_at, reviewed_by, reviewed_at
     FROM seller_price_edit_requests WHERE id = ? LIMIT 1`,
    [requestId]
  )
  const req = rows[0]
  if (!req) throw new Error('NOT_FOUND')
  if (req.status !== 'pending') throw new Error('NOT_PENDING')

  await queryDb(
    `UPDATE seller_price_edit_requests
     SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [reviewerId, requestId]
  )

  const updated = await queryDb<SellerPriceEditRequestRow[]>(
    `SELECT id, seller_id, product_id, list_owner_id, status, requested_at, reviewed_by, reviewed_at
     FROM seller_price_edit_requests WHERE id = ? LIMIT 1`,
    [requestId]
  )
  return updated[0]!
}

export async function listPendingEditRequestsForProducts(
  listOwnerId: string,
  productIds: string[]
): Promise<SellerPriceEditRequestRow[]> {
  if (!productIds.length) return []
  const placeholders = productIds.map(() => '?').join(', ')
  return queryDb<SellerPriceEditRequestRow[]>(
    `SELECT r.id, r.seller_id, r.product_id, r.list_owner_id, r.status, r.requested_at,
            r.reviewed_by, r.reviewed_at,
            COALESCE(NULLIF(TRIM(u.name), ''), u.email) AS seller_label
     FROM seller_price_edit_requests r
     LEFT JOIN users u ON u.id = r.seller_id
     WHERE r.list_owner_id = ? AND r.status = 'pending' AND r.product_id IN (${placeholders})
     ORDER BY r.requested_at ASC`,
    [listOwnerId, ...productIds]
  )
}

export async function assertSellerMayUpdatePrice(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<{ ok: true; isNew: boolean } | { ok: false; error: string }> {
  const state = await getSellerPriceLockState(listOwnerId, sellerId, productId)
  if (!state.hasPrice) return { ok: true, isNew: true }
  if (!state.locked) return { ok: true, isNew: false }
  return {
    ok: false,
    error: 'Price is locked. Contact an admin to change it.',
  }
}

export async function lockSellerPriceAfterSave(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<void> {
  await queryDb(
    `UPDATE seller_product_prices SET locked = 1
     WHERE list_owner_id = ? AND seller_id = ? AND product_id = ?`,
    [listOwnerId, sellerId, productId]
  )
}

export async function clearPendingEditRequestsForPrice(
  sellerId: string,
  productId: string
): Promise<void> {
  await queryDb(
    `DELETE FROM seller_price_edit_requests
     WHERE seller_id = ? AND product_id = ? AND status = 'pending'`,
    [sellerId, productId]
  )
}

export async function getSellerShippingLockState(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<{ hasShipping: boolean }> {
  const rows = await queryDb<{ shipping_cost: string | null }[]>(
    `SELECT shipping_cost FROM seller_product_prices
     WHERE list_owner_id = ? AND seller_id = ? AND product_id = ? LIMIT 1`,
    [listOwnerId, sellerId, productId]
  )
  const row = rows[0]
  if (row?.shipping_cost == null || row.shipping_cost === '') {
    return { hasShipping: false }
  }
  const n = Number(row.shipping_cost)
  if (!Number.isFinite(n) || n <= 0) {
    return { hasShipping: false }
  }
  return { hasShipping: true }
}

export async function assertSellerMayUpdateShipping(
  listOwnerId: string,
  sellerId: string,
  productId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const state = await getSellerShippingLockState(listOwnerId, sellerId, productId)
  if (!state.hasShipping) return { ok: true }
  return {
    ok: false,
    error: 'Shipping cost is locked. Contact an admin to change it.',
  }
}
