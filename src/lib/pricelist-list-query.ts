import {
  buildProductBrandSegmentFilter,
  buildQualifiedCategoryTextMatch,
  combineCategoryIdAndLegacyTextMatch,
  PRODUCT_CATEGORY_ID_UNSET_SQL,
} from '@/lib/catalog-products'
import { isPlatformPricelistOwner } from '@/lib/pricelist-constants'
import type { ShopCategoryFilterResult } from '@/lib/shop-category-tree'

export type PricelistListFilterInput = {
  search?: string
  categoryFilter?: ShopCategoryFilterResult
  brand?: string
  missingPricesOnly?: boolean
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

const LATEST_PLATFORM_PRICE_JOIN = `
LEFT JOIN (
  SELECT ranked.product_id, ranked.unit_price, ranked.stock_status, ranked.out_of_stock
  FROM (
    SELECT product_id, unit_price, stock_status, COALESCE(out_of_stock, 0) AS out_of_stock,
           ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY updated_at DESC) AS rn
    FROM seller_product_prices
  ) ranked
  WHERE ranked.rn = 1
) latest_platform_price ON latest_platform_price.product_id = p.id`

function platformMissingPriceSql(): string {
  return `(
    latest_platform_price.product_id IS NULL
    OR (
      COALESCE(latest_platform_price.stock_status, '') = ''
      AND latest_platform_price.out_of_stock = 0
      AND (latest_platform_price.unit_price IS NULL OR latest_platform_price.unit_price <= 0)
    )
  )`
}

function platformFilledPriceSql(): string {
  return `(
    latest_platform_price.unit_price IS NOT NULL
    AND latest_platform_price.unit_price > 0
    AND COALESCE(latest_platform_price.stock_status, '') = ''
    AND latest_platform_price.out_of_stock = 0
  )`
}

function sellerMissingPriceSql(sellerId: string): { sql: string; params: unknown[] } {
  return {
    sql: `NOT EXISTS (
      SELECT 1 FROM seller_product_prices spp
      WHERE spp.seller_id = ? AND spp.product_id = p.id
        AND (
          (spp.stock_status IS NOT NULL AND spp.stock_status <> '')
          OR COALESCE(spp.out_of_stock, 0) <> 0
          OR (spp.unit_price IS NOT NULL AND spp.unit_price > 0)
        )
    )`,
    params: [sellerId],
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
  where.push(brandFilter.sql)
  params.push(...brandFilter.params)
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

  const isPlatform = isPlatformPricelistOwner(listOwnerId)
  if (viewer.role === 'seller') {
    const sm = sellerMissingPriceSql(viewer.userId)
    where.push(sm.sql)
    params.push(...sm.params)
    return
  }

  if ((viewer.role === 'admin' || viewer.role === 'guest') && isPlatform) {
    if (!joins.value.includes('latest_platform_price')) {
      joins.value = `${joins.value}${LATEST_PLATFORM_PRICE_JOIN}`
    }
    where.push(platformMissingPriceSql())
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

  return {
    joins: joins.value,
    whereSql: `WHERE ${where.join(' AND ')}`,
    params,
  }
}

export function buildPricelistFilledPriceCountSql(
  listOwnerId: string,
  viewer: PricelistListViewer,
  filters: Omit<PricelistListFilterInput, 'missingPricesOnly'>
): PricelistSqlFragment | null {
  if (!isPlatformPricelistOwner(listOwnerId)) return null
  if (viewer.role !== 'admin' && viewer.role !== 'guest') return null

  const where: string[] = ['pi.owner_user_id = ?']
  const params: unknown[] = [listOwnerId]

  appendCategoryFilter(where, params, filters.categoryFilter)
  appendBrandFilter(where, params, filters.brand)
  appendSearchFilter(where, params, filters.search)
  where.push(platformFilledPriceSql())

  return {
    joins: LATEST_PLATFORM_PRICE_JOIN,
    whereSql: `WHERE ${where.join(' AND ')}`,
    params,
  }
}

export function buildPricelistMissingCountSql(
  listOwnerId: string,
  viewer: PricelistListViewer
): PricelistSqlFragment | null {
  const where: string[] = ['pi.owner_user_id = ?']
  const params: unknown[] = [listOwnerId]
  const joins = { value: '' }

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
