import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import {
  isPlatformPricelistOwner,
  PLATFORM_PRICELIST_OWNER_ID,
} from '@/lib/pricelist-constants'
import { hasApprovedSellerAccess } from '@/lib/seller-pricelist-access-db'
import { parseProductJsonField } from '@/lib/product-serialize'
import { resolveProductDisplayImages } from '@/lib/product-image-url'

export type PricelistRow = {
  item_id: string
  product_id: string
  name: string
  sku: string
  image_url: string
  created_at: string
  seller_unit_price: number | null
  seller_currency: string | null
  display_unit_price: number | null
  display_currency: string | null
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
): Promise<{ unit_price: number; currency: string } | null> {
  const rows = await queryDb<{ unit_price: string; currency: string }[]>(
    `SELECT unit_price, currency FROM seller_product_prices
     WHERE seller_id = ? AND product_id = ? LIMIT 1`,
    [sellerId, productId]
  )
  const row = rows[0]
  if (!row) return null
  return { unit_price: Number(row.unit_price), currency: row.currency }
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
  viewer: { userId: string; role: 'admin' | 'buyer' | 'seller' | 'guest' }
): Promise<PricelistRow[]> {
  const items = await queryDb<
    {
      item_id: string
      product_id: string
      name: string
      sku: string
      image_url: string
      gallery_images: unknown
      source_url: string | null
      created_at: string
    }[]
  >(
    `SELECT pi.id AS item_id, p.id AS product_id, p.name, p.sku, p.image_url, p.gallery_images,
            p.source_url, pi.created_at
     FROM pricelist_items pi
     INNER JOIN products p ON p.id = pi.product_id
     WHERE pi.owner_user_id = ?
     ORDER BY pi.created_at DESC`,
    [listOwnerId]
  )

  const rows: PricelistRow[] = []

  for (const item of items) {
    let sellerUnit: number | null = null
    let sellerCurrency: string | null = null
    let displayUnit: number | null = null
    let displayCurrency: string | null = null

    if (viewer.role === 'seller') {
      const sp = await getSellerProductPrice(viewer.userId, item.product_id)
      if (sp) {
        sellerUnit = sp.unit_price
        sellerCurrency = sp.currency
        displayUnit = sp.unit_price
        displayCurrency = sp.currency
      }
    } else if (viewer.role === 'buyer' && listOwnerId === viewer.userId) {
      const dp = await getBuyerDisplayPrice(listOwnerId, item.product_id)
      if (dp) {
        displayUnit = dp.unit_price
        displayCurrency = dp.currency
      }
    } else if (viewer.role === 'guest') {
      if (viewer.userId) {
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
      const own = await getSellerProductPrice(viewer.userId, item.product_id)
      if (own) {
        sellerUnit = own.unit_price
        sellerCurrency = own.currency
      }
      const prices = await queryDb<{ unit_price: string; currency: string }[]>(
        `SELECT unit_price, currency FROM seller_product_prices
         WHERE product_id = ?
         ORDER BY updated_at DESC LIMIT 1`,
        [item.product_id]
      )
      if (prices[0]) {
        displayUnit = Number(prices[0].unit_price)
        displayCurrency = prices[0].currency
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
      image_url: main,
      created_at: item.created_at,
      seller_unit_price: sellerUnit,
      seller_currency: sellerCurrency,
      display_unit_price: displayUnit,
      display_currency: displayCurrency,
    })
  }

  return rows
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
