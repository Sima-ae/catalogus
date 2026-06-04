import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import {
  isPlatformPricelistOwner,
  PLATFORM_PRICELIST_OWNER_ID,
} from '@/lib/pricelist-constants'
import { hasApprovedSellerAccess } from '@/lib/seller-pricelist-access-db'
import { listPendingEditRequestsForProducts } from '@/lib/seller-price-edit-db'
import { parseProductJsonField } from '@/lib/product-serialize'
import { resolveProductDisplayImages } from '@/lib/product-image-url'
import {
  isPricelistStockStatus,
  resolvePricelistPriceDisplay,
  type PricelistStockStatus,
} from '@/lib/pricelist-stock-status'

export type { PricelistStockStatus } from '@/lib/pricelist-stock-status'

export type PricelistRow = {
  item_id: string
  product_id: string
  name: string
  sku: string
  category: string
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

type SellerPriceRow = {
  unit_price: number
  currency: string
  locked: boolean
  stock_status: PricelistStockStatus | null
}

function mapSellerPriceRow(row: {
  unit_price: string
  currency: string
  locked: number | boolean
  out_of_stock: number | boolean
  stock_status: string | null
}): SellerPriceRow {
  const resolved = resolvePricelistPriceDisplay(row)
  return {
    unit_price: resolved.unit_price ?? 0,
    currency: resolved.currency ?? row.currency,
    locked: row.locked === 1 || row.locked === true,
    stock_status: resolved.stock_status,
  }
}

export async function getSellerProductPrice(
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
            stock_status
     FROM seller_product_prices
     WHERE seller_id = ? AND product_id = ? LIMIT 1`,
    [sellerId, productId]
  )
  const row = rows[0]
  if (!row) return null
  return mapSellerPriceRow(row)
}

async function loadSellerProductPricesMap(
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
            COALESCE(out_of_stock, 0) AS out_of_stock, stock_status
     FROM seller_product_prices
     WHERE seller_id = ? AND product_id IN (${placeholders})`,
    [sellerId, ...productIds]
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
         ON spp.seller_id = spa.seller_id AND spp.product_id IN (${placeholders})
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

async function loadLatestProductPricesMap(productIds: string[]): Promise<
  Map<
    string,
    {
      unit_price: number
      currency: string
      seller_id: string
      stock_status: PricelistStockStatus | null
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
    }[]
  >(
    `SELECT ranked.product_id, ranked.unit_price, ranked.currency, ranked.seller_id,
            ranked.out_of_stock, ranked.stock_status
     FROM (
       SELECT product_id, unit_price, currency, seller_id,
              COALESCE(out_of_stock, 0) AS out_of_stock, stock_status, updated_at,
              ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn
       FROM seller_product_prices
       WHERE product_id IN (${placeholders})
     ) ranked
     WHERE ranked.rn = 1`,
    productIds
  )

  for (const row of rows) {
    const resolved = resolvePricelistPriceDisplay(row)
    map.set(row.product_id, {
      unit_price: resolved.unit_price ?? 0,
      currency: resolved.currency ?? row.currency,
      seller_id: row.seller_id,
      stock_status: resolved.stock_status,
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
  sellerId: string
  productId: string
  unitPrice: number
  currency: string
  updatedBy: string
}): Promise<void> {
  await queryDb(
    `INSERT INTO seller_product_prices (seller_id, product_id, unit_price, currency, updated_by, out_of_stock, stock_status)
     VALUES (?, ?, ?, ?, ?, 0, NULL)
     ON DUPLICATE KEY UPDATE
       unit_price = VALUES(unit_price),
       currency = VALUES(currency),
       updated_by = VALUES(updated_by),
       out_of_stock = 0,
       stock_status = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [input.sellerId, input.productId, input.unitPrice, input.currency, input.updatedBy]
  )
}

export async function setSellerProductStockStatus(input: {
  sellerId: string
  productId: string
  stockStatus: PricelistStockStatus
  currency: string
  updatedBy: string
}): Promise<void> {
  if (!isPricelistStockStatus(input.stockStatus)) {
    throw new Error('Invalid stock status')
  }
  await queryDb(
    `INSERT INTO seller_product_prices (seller_id, product_id, unit_price, currency, updated_by, out_of_stock, stock_status)
     VALUES (?, ?, 0, ?, ?, 1, ?)
     ON DUPLICATE KEY UPDATE
       unit_price = 0,
       out_of_stock = 1,
       stock_status = VALUES(stock_status),
       currency = VALUES(currency),
       updated_by = VALUES(updated_by),
       updated_at = CURRENT_TIMESTAMP`,
    [
      input.sellerId,
      input.productId,
      input.currency,
      input.updatedBy,
      input.stockStatus,
    ]
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

  const [
    pendingByProduct,
    sellerPrices,
    buyerDisplayPrices,
    latestPrices,
    sellerPendingEdits,
    adminOwnPrices,
  ] = await Promise.all([
    viewer.role === 'admin' && isPlatformPricelistOwner(listOwnerId)
      ? listPendingEditRequestsForProducts(listOwnerId, productIds).then(groupPendingByProduct)
      : Promise.resolve(new Map<string, PricelistRow['pending_edit_requests']>()),
    viewer.role === 'seller' || (viewer.role === 'guest' && viewer.userId)
      ? loadSellerProductPricesMap(viewer.userId, productIds)
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
    isPlatformPricelistOwner(listOwnerId)
      ? loadLatestProductPricesMap(productIds)
      : Promise.resolve(
          new Map<
            string,
            {
              unit_price: number
              currency: string
              seller_id: string
              stock_status: PricelistStockStatus | null
            }
          >()
        ),
    viewer.role === 'seller'
      ? loadPendingEditRequestsMap(viewer.userId, listOwnerId, productIds)
      : Promise.resolve(new Map<string, boolean>()),
    viewer.role === 'admin' && isPlatformPricelistOwner(listOwnerId)
      ? loadSellerProductPricesMap(viewer.userId, productIds)
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
        priceLocked = true
        canEditPrice = false
      } else {
        canEditPrice = true
      }
      if (sellerPendingEdits.get(item.product_id)) {
        editRequestPending = true
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
    } else if (viewer.role === 'guest') {
      if (viewer.userId) {
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
            'seller'
          )
        }
      }

      if (isPlatformPricelistOwner(listOwnerId)) {
        const latest = latestPrices.get(item.product_id)
        if (latest) {
          applyResolvedPriceToRowFields(
            resolvePricelistPriceDisplay(latest),
            rowPriceTarget,
            'display'
          )
        }
        canEditPrice = true
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
      }
    } else if (viewer.role === 'admin' && isPlatformPricelistOwner(listOwnerId)) {
      canEditPrice = true
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
      brand: item.brand?.trim() || '—',
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
