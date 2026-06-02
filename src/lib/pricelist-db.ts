import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import {
  isPlatformPricelistOwner,
  PLATFORM_PRICELIST_OWNER_ID,
} from '@/lib/pricelist-constants'
import { hasApprovedSellerAccess } from '@/lib/seller-pricelist-access-db'
import {
  getPendingEditRequest,
  listPendingEditRequestsForProducts,
} from '@/lib/seller-price-edit-db'
import { parseProductJsonField } from '@/lib/product-serialize'
import { resolveProductDisplayImages } from '@/lib/product-image-url'

export type PricelistRow = {
  item_id: string
  product_id: string
  name: string
  sku: string
  category: string
  brand: string
  image_url: string
  created_at: string
  seller_unit_price: number | null
  seller_currency: string | null
  display_unit_price: number | null
  display_currency: string | null
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

  const id = randomUUID()
  await queryDb(
    `INSERT INTO pricelist_items (id, owner_user_id, product_id, added_by_user_id)
     VALUES (?, ?, ?, ?)`,
    [id, input.ownerUserId, input.productId, input.addedByUserId]
  )
}

export async function removePricelistItem(ownerUserId: string, productId: string): Promise<void> {
  await queryDb(
    `DELETE FROM pricelist_items WHERE owner_user_id = ? AND product_id = ?`,
    [ownerUserId, productId]
  )
}

export async function getSellerProductPrice(
  sellerId: string,
  productId: string
): Promise<{ unit_price: number; currency: string; locked: boolean } | null> {
  const rows = await queryDb<{ unit_price: string; currency: string; locked: number | boolean }[]>(
    `SELECT unit_price, currency, COALESCE(locked, 0) AS locked FROM seller_product_prices
     WHERE seller_id = ? AND product_id = ? LIMIT 1`,
    [sellerId, productId]
  )
  const row = rows[0]
  if (!row) return null
  return {
    unit_price: Number(row.unit_price),
    currency: row.currency,
    locked: row.locked === 1 || row.locked === true,
  }
}

export async function upsertSellerProductPrice(input: {
  sellerId: string
  productId: string
  unitPrice: number
  currency: string
  updatedBy: string
}): Promise<void> {
  await queryDb(
    `INSERT INTO seller_product_prices (seller_id, product_id, unit_price, currency, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       unit_price = VALUES(unit_price),
       currency = VALUES(currency),
       updated_by = VALUES(updated_by),
       updated_at = CURRENT_TIMESTAMP`,
    [input.sellerId, input.productId, input.unitPrice, input.currency, input.updatedBy]
  )
}

export async function deleteSellerProductPrice(
  sellerId: string,
  productId: string
): Promise<boolean> {
  const result = await queryDb<{ affectedRows?: number }>(
    `DELETE FROM seller_product_prices WHERE seller_id = ? AND product_id = ?`,
    [sellerId, productId]
  )
  return (result?.affectedRows ?? 0) > 0
}

async function getBuyerDisplayPrice(
  listOwnerId: string,
  productId: string
): Promise<{ unit_price: number; currency: string } | null> {
  const rows = await queryDb<{ unit_price: string; currency: string }[]>(
    `SELECT spp.unit_price, spp.currency
     FROM seller_pricelist_access spa
     INNER JOIN seller_product_prices spp ON spp.seller_id = spa.seller_id AND spp.product_id = ?
     WHERE spa.list_owner_id = ? AND spa.status = 'approved'
     ORDER BY spp.updated_at DESC
     LIMIT 1`,
    [productId, listOwnerId]
  )
  const row = rows[0]
  if (!row) return null
  return { unit_price: Number(row.unit_price), currency: row.currency }
}

export async function listPricelistRows(
  listOwnerId: string,
  viewer: {
    userId: string
    role: 'admin' | 'buyer' | 'seller' | 'guest'
    isSuperAdmin?: boolean
  }
): Promise<PricelistRow[]> {
  const items = await queryDb<
    {
      item_id: string
      product_id: string
      name: string
      sku: string
      category: string | null
      brand: string | null
      image_url: string
      gallery_images: unknown
      source_url: string | null
      created_at: string
    }[]
  >(
    `SELECT pi.id AS item_id, p.id AS product_id, p.name, p.sku, p.category, p.brand,
            p.image_url, p.gallery_images, p.source_url, pi.created_at
     FROM pricelist_items pi
     INNER JOIN products p ON p.id = pi.product_id
     WHERE pi.owner_user_id = ?
     ORDER BY pi.created_at DESC`,
    [listOwnerId]
  )

  const rows: PricelistRow[] = []
  const productIds = items.map((i) => i.product_id)
  const pendingByProduct =
    viewer.role === 'admin' && isPlatformPricelistOwner(listOwnerId)
      ? groupPendingByProduct(await listPendingEditRequestsForProducts(listOwnerId, productIds))
      : new Map<string, PricelistRow['pending_edit_requests']>()

  for (const item of items) {
    let sellerUnit: number | null = null
    let sellerCurrency: string | null = null
    let displayUnit: number | null = null
    let displayCurrency: string | null = null

    let priceLocked: boolean | undefined
    let editRequestPending: boolean | undefined
    let canEditPrice: boolean | undefined
    let priceSellerId: string | undefined

    if (viewer.role === 'seller') {
      priceSellerId = viewer.userId
      const sp = await getSellerProductPrice(viewer.userId, item.product_id)
      if (sp) {
        sellerUnit = sp.unit_price
        sellerCurrency = sp.currency
        displayUnit = sp.unit_price
        displayCurrency = sp.currency
        priceLocked = true
        canEditPrice = false
      } else {
        canEditPrice = true
      }
      const pending = await getPendingEditRequest(viewer.userId, item.product_id, listOwnerId)
      if (pending) {
        editRequestPending = true
      }
    } else if (viewer.role === 'buyer' && listOwnerId === viewer.userId) {
      const dp = await getBuyerDisplayPrice(listOwnerId, item.product_id)
      if (dp) {
        displayUnit = dp.unit_price
        displayCurrency = dp.currency
      }
    } else if (viewer.role === 'guest') {
      if (viewer.userId) {
        priceSellerId = viewer.userId
        const sp = await getSellerProductPrice(viewer.userId, item.product_id)
        if (sp) {
          sellerUnit = sp.unit_price
          sellerCurrency = sp.currency
        }
      }
      const dp = await getBuyerDisplayPrice(listOwnerId, item.product_id)
      if (dp) {
        displayUnit = dp.unit_price
        displayCurrency = dp.currency
      }
    } else if (viewer.role === 'admin' && isPlatformPricelistOwner(listOwnerId)) {
      canEditPrice = true
      const own = await getSellerProductPrice(viewer.userId, item.product_id)
      if (own) {
        sellerUnit = own.unit_price
        sellerCurrency = own.currency
        priceSellerId = viewer.userId
      }
      const prices = await queryDb<{ unit_price: string; currency: string; seller_id: string }[]>(
        `SELECT unit_price, currency, seller_id FROM seller_product_prices
         WHERE product_id = ?
         ORDER BY updated_at DESC LIMIT 1`,
        [item.product_id]
      )
      if (prices[0]) {
        displayUnit = Number(prices[0].unit_price)
        displayCurrency = prices[0].currency
        if (!priceSellerId) {
          priceSellerId = prices[0].seller_id
        }
      }
    }

    const gallery = parseProductJsonField(item.gallery_images)
    const { main } = resolveProductDisplayImages(
      item.image_url,
      gallery,
      item.source_url
    )

    rows.push({
      item_id: item.item_id,
      product_id: item.product_id,
      name: item.name,
      sku: item.sku,
      category: item.category?.trim() || '—',
      brand: item.brand?.trim() || '—',
      image_url: main,
      created_at: item.created_at,
      seller_unit_price: sellerUnit,
      seller_currency: sellerCurrency,
      display_unit_price: displayUnit,
      display_currency: displayCurrency,
      price_locked: priceLocked,
      edit_request_pending: editRequestPending,
      can_edit_price: canEditPrice,
      pending_edit_requests: pendingByProduct.get(item.product_id),
      price_seller_id: priceSellerId,
    })
  }

  return rows
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

  const platformOk = await hasApprovedSellerAccess(sellerId, PLATFORM_PRICELIST_OWNER_ID)
  if (platformOk) {
    owners.push({
      id: PLATFORM_PRICELIST_OWNER_ID,
      label: 'Platform pricelist',
      kind: 'platform',
    })
  }

  const buyers = await queryDb<{ id: string; email: string; name: string | null }[]>(
    `SELECT u.id, u.email, u.name
     FROM seller_pricelist_access spa
     INNER JOIN users u ON u.id = spa.list_owner_id
     WHERE spa.seller_id = ? AND spa.status = 'approved' AND u.role = 'buyer'
     ORDER BY COALESCE(u.name, u.email) ASC`,
    [sellerId]
  )

  for (const b of buyers) {
    owners.push({
      id: b.id,
      label: b.name?.trim() || b.email,
      kind: 'buyer',
    })
  }

  return owners
}
