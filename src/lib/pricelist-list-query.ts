import {
  buildProductBrandSegmentFilter,
  buildQualifiedCategoryTextMatch,
  combineCategoryIdAndLegacyTextMatch,
  PRODUCT_CATEGORY_ID_UNSET_SQL,
} from '@/lib/catalog-products'
import { SELLER_PRICE_LATEST_ROW_ORDER_SQL } from '@/lib/pricelist-constants'
import { isCuratedSupplierPricelist } from '@/lib/pricelist-pages-db'
import type { ShopCategoryFilterResult } from '@/lib/shop-category-tree'

export type PricelistListFilterInput = {
  search?: string
  categoryFilter?: ShopCategoryFilterResult
  brand?: string
  missingPricesOnly?: boolean
  filledPricesOnly?: boolean
  outOfStockOnly?: boolean
}

export type PricelistListViewer = {
  userId: string
  role: 'admin' | 'buyer' | 'seller' | 'guest'
  isSuperAdmin?: boolean
}

export type PricelistSqlFragment = {
  joins: string
  whereSql: string
  params: unknown[]
}

function buildLatestListPriceJoin(listOwnerId: string): string {
  return `
LEFT JOIN (
  SELECT ranked.product_id, ranked.unit_price, ranked.stock_status, ranked.out_of_stock, ranked.shipping_cost
  FROM (
    SELECT product_id, unit_price, stock_status, COALESCE(out_of_stock, 0) AS out_of_stock, shipping_cost,
           ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY ${SELLER_PRICE_LATEST_ROW_ORDER_SQL}) AS rn
    FROM seller_product_prices
    WHERE list_owner_id = '${listOwnerId.replace(/'/g, "''")}'
  ) ranked
  WHERE ranked.rn = 1
) latest_list_price ON latest_list_price.product_id = p.id`
}

/** Purchase price set and not uitverkocht (used for "Met prijs" filter). */
function curatedFilledPriceSql(): string {
  return `(
    latest_list_price.unit_price IS NOT NULL
    AND latest_list_price.unit_price > 0
    AND COALESCE(latest_list_price.stock_status, '') = ''
    AND COALESCE(latest_list_price.out_of_stock, 0) = 0
  )`
}

/** Both purchase price and shipping saved — hidden from "Ontbrekend" list. */
function curatedCompleteSql(): string {
  return `(
    latest_list_price.unit_price IS NOT NULL
    AND latest_list_price.unit_price > 0
    AND COALESCE(latest_list_price.stock_status, '') = ''
    AND COALESCE(latest_list_price.out_of_stock, 0) = 0
    AND latest_list_price.shipping_cost IS NOT NULL
  )`
}

function curatedMissingPriceSql(): string {
  const hasPrice = `(
    latest_list_price.unit_price IS NOT NULL
    AND latest_list_price.unit_price > 0
    AND COALESCE(latest_list_price.stock_status, '') = ''
    AND COALESCE(latest_list_price.out_of_stock, 0) = 0
  )`
  const missingShipping = `(
    ${hasPrice}
    AND latest_list_price.shipping_cost IS NULL
  )`
  const missingPrice = `(
    latest_list_price.product_id IS NULL
    OR (
      COALESCE(latest_list_price.stock_status, '') = ''
      AND COALESCE(latest_list_price.out_of_stock, 0) = 0
      AND (latest_list_price.unit_price IS NULL OR latest_list_price.unit_price <= 0)
    )
  )`
  return `(
    NOT (${curatedOutOfStockSql().slice(1, -1)})
    AND (${missingPrice} OR ${missingShipping})
  )`
}

function curatedOutOfStockSql(): string {
  return `(
    COALESCE(latest_list_price.stock_status, '') IN ('out', 'temporary')
    OR (
      COALESCE(latest_list_price.stock_status, '') = ''
      AND COALESCE(latest_list_price.out_of_stock, 0) <> 0
      AND (latest_list_price.unit_price IS NULL OR latest_list_price.unit_price <= 0)
    )
  )`
}

function ensureCuratedPriceJoin(joins: { value: string }, listOwnerId: string): void {
  if (!joins.value.includes('latest_list_price')) {
    joins.value = `${joins.value}${buildLatestListPriceJoin(listOwnerId)}`
  }
}

function sellerFilledPriceSql(listOwnerId: string, sellerId: string): { sql: string; params: unknown[] } {
  return {
    sql: `EXISTS (
      SELECT 1 FROM seller_product_prices spp
      WHERE spp.list_owner_id = ? AND spp.seller_id = ? AND spp.product_id = p.id
        AND spp.unit_price IS NOT NULL AND spp.unit_price > 0
        AND COALESCE(spp.stock_status, '') = ''
        AND COALESCE(spp.out_of_stock, 0) = 0
    )`,
    params: [listOwnerId, sellerId],
  }
}

function sellerCompleteSql(listOwnerId: string, sellerId: string): { sql: string; params: unknown[] } {
  return {
    sql: `EXISTS (
      SELECT 1 FROM seller_product_prices spp
      WHERE spp.list_owner_id = ? AND spp.seller_id = ? AND spp.product_id = p.id
        AND spp.unit_price IS NOT NULL AND spp.unit_price > 0
        AND COALESCE(spp.stock_status, '') = ''
        AND COALESCE(spp.out_of_stock, 0) = 0
        AND spp.shipping_cost IS NOT NULL
    )`,
    params: [listOwnerId, sellerId],
  }
}

function sellerMissingPriceSql(listOwnerId: string, sellerId: string): { sql: string; params: unknown[] } {
  const complete = sellerCompleteSql(listOwnerId, sellerId)
  const oos = sellerOutOfStockSql(listOwnerId, sellerId)
  return {
    sql: `NOT (${complete.sql}) AND NOT (${oos.sql})`,
    params: [...complete.params, ...oos.params],
  }
}

function appendCategoryFilter(
  where: string[],
  params: unknown[],
  categoryFilter?: ShopCategoryFilterResult
): void {
  if (!categoryFilter) return

  if (!categoryFilter.categoryIds.length) {
    where.push('1 = 0')
    return
  }

  const idPlaceholders = categoryFilter.categoryIds.map(() => '?').join(', ')
  const idClause = `p.category_id IN (${idPlaceholders})`
  const idParams = [...categoryFilter.categoryIds]

  if (categoryFilter.strictIdOnly) {
    const labels = [
      categoryFilter.categoryStorageLabel?.trim(),
      ...(categoryFilter.legacyNames ?? []),
    ].filter(Boolean) as string[]
    const textMatch = buildQualifiedCategoryTextMatch(labels)
    const combined = combineCategoryIdAndLegacyTextMatch(idClause, idParams, textMatch)
    where.push(combined.sql)
    params.push(...combined.params)
  } else if (categoryFilter.legacyNames?.length) {
    const legacy = buildQualifiedCategoryTextMatch(categoryFilter.legacyNames)
    const combined = combineCategoryIdAndLegacyTextMatch(idClause, idParams, legacy)
    where.push(combined.sql)
    params.push(...combined.params)
  } else {
    where.push(idClause)
    params.push(...idParams)
  }

  const excludeIds = categoryFilter.excludeCategoryIds?.filter(Boolean)
  if (excludeIds?.length) {
    const ex = excludeIds.map(() => '?').join(', ')
    where.push(`(${PRODUCT_CATEGORY_ID_UNSET_SQL} OR p.category_id NOT IN (${ex}))`)
    params.push(...excludeIds)
  }
}

function appendSearchFilter(where: string[], params: unknown[], search?: string): void {
  const q = search?.trim()
  if (!q) return
  const like = `%${q}%`
  where.push('(p.name LIKE ? OR p.sku LIKE ?)')
  params.push(like, like)
}

function appendBrandFilter(where: string[], params: unknown[], brand?: string): void {
  const b = brand?.trim()
  if (!b || b === 'All') return
  const brandFilter = buildProductBrandSegmentFilter(b)
  const lower = b.toLowerCase()
  where.push(
    `(${brandFilter.sql} OR EXISTS (
      SELECT 1 FROM brands bx
      WHERE bx.active = 1 AND bx.id = p.brand_id AND LOWER(TRIM(bx.name)) = ?
    ))`
  )
  params.push(...brandFilter.params, lower)
}

function sellerOutOfStockSql(listOwnerId: string, sellerId: string): { sql: string; params: unknown[] } {
  return {
    sql: `EXISTS (
      SELECT 1 FROM seller_product_prices spp
      WHERE spp.list_owner_id = ? AND spp.seller_id = ? AND spp.product_id = p.id
        AND (
          spp.stock_status IN ('out', 'temporary')
          OR (
            COALESCE(spp.stock_status, '') = ''
            AND COALESCE(spp.out_of_stock, 0) <> 0
            AND (spp.unit_price IS NULL OR spp.unit_price <= 0)
          )
        )
    )`,
    params: [listOwnerId, sellerId],
  }
}

function appendMissingPriceFilter(
  where: string[],
  params: unknown[],
  joins: { value: string },
  listOwnerId: string,
  viewer: PricelistListViewer,
  missingPricesOnly?: boolean
): void {
  if (!missingPricesOnly) return

  const isCurated = isCuratedSupplierPricelist(listOwnerId)
  if (viewer.role === 'seller') {
    const sm = sellerMissingPriceSql(listOwnerId, viewer.userId)
    where.push(sm.sql)
    params.push(...sm.params)
    return
  }

  if ((viewer.role === 'admin' || viewer.role === 'guest') && isCurated) {
    ensureCuratedPriceJoin(joins, listOwnerId)
    where.push(curatedMissingPriceSql())
  }
}

function appendFilledPriceFilter(
  where: string[],
  params: unknown[],
  joins: { value: string },
  listOwnerId: string,
  viewer: PricelistListViewer,
  filledPricesOnly?: boolean
): void {
  if (!filledPricesOnly) return

  const isCurated = isCuratedSupplierPricelist(listOwnerId)
  if (viewer.role === 'seller') {
    const sf = sellerFilledPriceSql(listOwnerId, viewer.userId)
    where.push(sf.sql)
    params.push(...sf.params)
    return
  }

  if ((viewer.role === 'admin' || viewer.role === 'guest') && isCurated) {
    ensureCuratedPriceJoin(joins, listOwnerId)
    where.push(curatedFilledPriceSql())
  }
}

function appendOutOfStockFilter(
  where: string[],
  params: unknown[],
  joins: { value: string },
  listOwnerId: string,
  viewer: PricelistListViewer,
  outOfStockOnly?: boolean
): void {
  if (!outOfStockOnly) return

  const isCurated = isCuratedSupplierPricelist(listOwnerId)
  if (viewer.role === 'seller') {
    const so = sellerOutOfStockSql(listOwnerId, viewer.userId)
    where.push(so.sql)
    params.push(...so.params)
    return
  }

  if ((viewer.role === 'admin' || viewer.role === 'guest') && isCurated) {
    ensureCuratedPriceJoin(joins, listOwnerId)
    where.push(curatedOutOfStockSql())
  }
}

export function buildPricelistListSql(
  listOwnerId: string,
  viewer: PricelistListViewer,
  filters: PricelistListFilterInput
): PricelistSqlFragment {
  const where: string[] = ['pi.owner_user_id = ?']
  const params: unknown[] = [listOwnerId]
  const joins = { value: '' }

  appendCategoryFilter(where, params, filters.categoryFilter)
  appendBrandFilter(where, params, filters.brand)
  appendSearchFilter(where, params, filters.search)
  appendMissingPriceFilter(where, params, joins, listOwnerId, viewer, filters.missingPricesOnly)
  appendFilledPriceFilter(where, params, joins, listOwnerId, viewer, filters.filledPricesOnly)
  appendOutOfStockFilter(where, params, joins, listOwnerId, viewer, filters.outOfStockOnly)

  return {
    joins: joins.value,
    whereSql: `WHERE ${where.join(' AND ')}`,
    params,
  }
}

export function buildPricelistFilledPriceCountSql(
  listOwnerId: string,
  viewer: PricelistListViewer,
  filters: Omit<
    PricelistListFilterInput,
    'missingPricesOnly' | 'filledPricesOnly' | 'outOfStockOnly'
  >
): PricelistSqlFragment | null {
  if (!isCuratedSupplierPricelist(listOwnerId)) return null
  if (viewer.role !== 'admin' && viewer.role !== 'guest') return null

  const where: string[] = ['pi.owner_user_id = ?']
  const params: unknown[] = [listOwnerId]

  appendCategoryFilter(where, params, filters.categoryFilter)
  appendBrandFilter(where, params, filters.brand)
  appendSearchFilter(where, params, filters.search)
  where.push(curatedFilledPriceSql())

  return {
    joins: buildLatestListPriceJoin(listOwnerId),
    whereSql: `WHERE ${where.join(' AND ')}`,
    params,
  }
}

export function buildPricelistOutOfStockCountSql(
  listOwnerId: string,
  viewer: PricelistListViewer
): PricelistSqlFragment | null {
  const where: string[] = ['pi.owner_user_id = ?']
  const params: unknown[] = [listOwnerId]
  const joins = { value: '' }

  appendOutOfStockFilter(where, params, joins, listOwnerId, viewer, true)

  if (!joins.value && viewer.role !== 'seller') {
    return null
  }

  return {
    joins: joins.value,
    whereSql: `WHERE ${where.join(' AND ')}`,
    params,
  }
}

export function buildPricelistMissingCountSql(
  listOwnerId: string,
  viewer: PricelistListViewer,
  filters: Omit<
    PricelistListFilterInput,
    'missingPricesOnly' | 'filledPricesOnly' | 'outOfStockOnly'
  > = {}
): PricelistSqlFragment | null {
  const where: string[] = ['pi.owner_user_id = ?']
  const params: unknown[] = [listOwnerId]
  const joins = { value: '' }

  appendCategoryFilter(where, params, filters.categoryFilter)
  appendBrandFilter(where, params, filters.brand)
  appendSearchFilter(where, params, filters.search)
  appendMissingPriceFilter(where, params, joins, listOwnerId, viewer, true)

  if (!joins.value && viewer.role !== 'seller') {
    return null
  }

  return {
    joins: joins.value,
    whereSql: `WHERE ${where.join(' AND ')}`,
    params,
  }
}
