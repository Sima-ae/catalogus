import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import {
  PLATFORM_PRICELIST_OWNER_ID,
  PRICELIST_OWNER_QUERY_PLATFORM,
} from '@/lib/pricelist-constants'

export type PricelistPageRow = {
  id: string
  slug: string
  label: string
  sort_order: number
  active: boolean
  created_at: string
}

const SLUG_PATTERN = /^[a-z][a-z0-9_-]*$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CACHE_TTL_MS = 30_000

let cacheLoadedAt = 0
let pagesById = new Map<string, PricelistPageRow>()
let slugToId = new Map<string, string>()
let curatedOwnerIds = new Set<string>()

function mapPageRow(row: {
  id: string
  slug: string
  label: string
  sort_order: number
  active: number | boolean
  created_at: string
}): PricelistPageRow {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    sort_order: Number(row.sort_order),
    active: row.active === 1 || row.active === true,
    created_at: row.created_at,
  }
}

function applyCache(rows: PricelistPageRow[]): void {
  pagesById = new Map(rows.map((r) => [r.id, r]))
  slugToId = new Map(rows.map((r) => [r.slug, r.id]))
  curatedOwnerIds = new Set(rows.filter((r) => r.active).map((r) => r.id))
  curatedOwnerIds.add(PLATFORM_PRICELIST_OWNER_ID)
  cacheLoadedAt = Date.now()
}

export function invalidatePricelistPagesCache(): void {
  cacheLoadedAt = 0
  pagesById = new Map()
  slugToId = new Map()
  curatedOwnerIds = new Set([PLATFORM_PRICELIST_OWNER_ID])
}

export async function ensurePricelistPagesCache(): Promise<void> {
  if (Date.now() - cacheLoadedAt < CACHE_TTL_MS && pagesById.size > 0) return
  await refreshPricelistPagesCache()
}

export async function refreshPricelistPagesCache(): Promise<PricelistPageRow[]> {
  try {
    const rows = await queryDb<
      {
        id: string
        slug: string
        label: string
        sort_order: number
        active: number | boolean
        created_at: string
      }[]
    >(
      `SELECT id, slug, label, sort_order, active, created_at
       FROM pricelist_pages
       ORDER BY sort_order ASC, label ASC`
    )
    const mapped = rows.map(mapPageRow)
    if (!mapped.some((r) => r.id === PLATFORM_PRICELIST_OWNER_ID)) {
      mapped.unshift({
        id: PLATFORM_PRICELIST_OWNER_ID,
        slug: PRICELIST_OWNER_QUERY_PLATFORM,
        label: 'Platform pricelist',
        sort_order: 0,
        active: true,
        created_at: new Date().toISOString(),
      })
    }
    applyCache(mapped)
    return mapped
  } catch {
    applyCache([
      {
        id: PLATFORM_PRICELIST_OWNER_ID,
        slug: PRICELIST_OWNER_QUERY_PLATFORM,
        label: 'Platform pricelist',
        sort_order: 0,
        active: true,
        created_at: new Date().toISOString(),
      },
    ])
    return Array.from(pagesById.values())
  }
}

export async function listPricelistPages(options?: {
  activeOnly?: boolean
}): Promise<PricelistPageRow[]> {
  const all = await refreshPricelistPagesCache()
  if (options?.activeOnly) return all.filter((p) => p.active)
  return all
}

export async function getPricelistPageById(id: string): Promise<PricelistPageRow | null> {
  await ensurePricelistPagesCache()
  return pagesById.get(id) ?? null
}

export async function getPricelistPageBySlug(slug: string): Promise<PricelistPageRow | null> {
  await ensurePricelistPagesCache()
  const id = slugToId.get(slug.trim())
  return id ? pagesById.get(id) ?? null : null
}

/** Sync check against in-memory cache (call ensurePricelistPagesCache in API routes first). */
export function isCuratedSupplierPricelist(ownerId: string): boolean {
  if (!ownerId) return false
  if (ownerId === PLATFORM_PRICELIST_OWNER_ID) return true
  if (curatedOwnerIds.size <= 1 && cacheLoadedAt === 0) {
    return ownerId === PLATFORM_PRICELIST_OWNER_ID
  }
  return curatedOwnerIds.has(ownerId)
}

/** @deprecated Use isCuratedSupplierPricelist */
export function isPlatformPricelistOwner(ownerId: string): boolean {
  return isCuratedSupplierPricelist(ownerId)
}

export function ownerIdToSlug(ownerId: string): string {
  if (ownerId === PLATFORM_PRICELIST_OWNER_ID) return PRICELIST_OWNER_QUERY_PLATFORM
  const page = pagesById.get(ownerId)
  if (page) return page.slug
  if (slugToId.has(ownerId)) return ownerId
  return ownerId
}

export function parsePricelistOwnerParam(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null
  const v = raw.trim()
  if (v === PRICELIST_OWNER_QUERY_PLATFORM) return PLATFORM_PRICELIST_OWNER_ID
  const fromSlug = slugToId.get(v)
  if (fromSlug) return fromSlug
  if (UUID_PATTERN.test(v)) return v
  return null
}

export async function resolvePricelistOwnerId(
  raw: string | null | undefined
): Promise<string | null> {
  await ensurePricelistPagesCache()
  return parsePricelistOwnerParam(raw)
}

export function validatePricelistPageSlug(slug: string): string | null {
  const v = slug.trim().toLowerCase()
  if (!v) return 'Slug is required'
  if (!SLUG_PATTERN.test(v)) {
    return 'Slug must start with a letter and contain only lowercase letters, numbers, hyphens, or underscores'
  }
  if (v === PRICELIST_OWNER_QUERY_PLATFORM) return null
  return null
}

export async function createPricelistPage(input: {
  slug: string
  label: string
  sortOrder?: number
}): Promise<PricelistPageRow> {
  const slug = input.slug.trim().toLowerCase()
  const label = input.label.trim()
  const slugError = validatePricelistPageSlug(slug)
  if (slugError) throw new Error(slugError)
  if (!label) throw new Error('Label is required')

  const existing = await getPricelistPageBySlug(slug)
  if (existing) throw new Error('Slug already in use')

  const id = randomUUID()
  const sortOrder = input.sortOrder ?? 0
  await queryDb(
    `INSERT INTO pricelist_pages (id, slug, label, sort_order, active)
     VALUES (?, ?, ?, ?, 1)`,
    [id, slug, label, sortOrder]
  )
  invalidatePricelistPagesCache()
  const page = await getPricelistPageById(id)
  if (!page) throw new Error('Failed to create pricelist page')
  return page
}

export async function updatePricelistPage(
  id: string,
  input: {
    slug?: string
    label?: string
    sortOrder?: number
    active?: boolean
  }
): Promise<PricelistPageRow> {
  const current = await getPricelistPageById(id)
  if (!current) throw new Error('Pricelist page not found')

  const updates: string[] = []
  const params: unknown[] = []

  if (input.slug !== undefined) {
    const slug = input.slug.trim().toLowerCase()
    const slugError = validatePricelistPageSlug(slug)
    if (slugError) throw new Error(slugError)
    if (slug !== current.slug) {
      const taken = await getPricelistPageBySlug(slug)
      if (taken && taken.id !== id) throw new Error('Slug already in use')
    }
    updates.push('slug = ?')
    params.push(slug)
  }

  if (input.label !== undefined) {
    const label = input.label.trim()
    if (!label) throw new Error('Label is required')
    updates.push('label = ?')
    params.push(label)
  }

  if (input.sortOrder !== undefined) {
    updates.push('sort_order = ?')
    params.push(input.sortOrder)
  }

  if (input.active !== undefined) {
    if (id === PLATFORM_PRICELIST_OWNER_ID && !input.active) {
      throw new Error('Cannot deactivate the platform pricelist')
    }
    updates.push('active = ?')
    params.push(input.active ? 1 : 0)
  }

  if (!updates.length) return current

  params.push(id)
  await queryDb(`UPDATE pricelist_pages SET ${updates.join(', ')} WHERE id = ?`, params)
  invalidatePricelistPagesCache()
  const page = await getPricelistPageById(id)
  if (!page) throw new Error('Pricelist page not found')
  return page
}

export async function deletePricelistPage(id: string): Promise<void> {
  if (id === PLATFORM_PRICELIST_OWNER_ID) {
    throw new Error('Cannot delete the platform pricelist')
  }
  const itemRows = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt FROM pricelist_items WHERE owner_user_id = ?`,
    [id]
  )
  if (Number(itemRows[0]?.cnt ?? 0) > 0) {
    throw new Error('Cannot delete a pricelist page that still has products')
  }
  await queryDb(`DELETE FROM pricelist_pages WHERE id = ?`, [id])
  invalidatePricelistPagesCache()
}

export async function countPricelistPageItems(pageId: string): Promise<number> {
  const rows = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt FROM pricelist_items WHERE owner_user_id = ?`,
    [pageId]
  )
  return Number(rows[0]?.cnt ?? 0)
}

export async function getProductCuratedPricelistId(
  productId: string
): Promise<string | null> {
  const rows = await queryDb<{ supplier_pricelist_id: string | null }[]>(
    `SELECT supplier_pricelist_id FROM products WHERE id = ? LIMIT 1`,
    [productId]
  )
  const fromProduct = rows[0]?.supplier_pricelist_id?.trim()
  if (fromProduct && isCuratedSupplierPricelist(fromProduct)) return fromProduct

  await ensurePricelistPagesCache()
  const curatedIds = Array.from(curatedOwnerIds)
  if (!curatedIds.length) return null

  const placeholders = curatedIds.map(() => '?').join(', ')
  const itemRows = await queryDb<{ owner_user_id: string }[]>(
    `SELECT owner_user_id FROM pricelist_items
     WHERE product_id = ? AND owner_user_id IN (${placeholders})
     LIMIT 1`,
    [productId, ...curatedIds]
  )
  return itemRows[0]?.owner_user_id ?? null
}

export async function findConflictingCuratedPricelist(
  productId: string,
  targetOwnerId: string
): Promise<string | null> {
  if (!isCuratedSupplierPricelist(targetOwnerId)) return null
  const assigned = await getProductCuratedPricelistId(productId)
  if (!assigned || assigned === targetOwnerId) return null
  return assigned
}

export async function setProductSupplierPricelistId(
  productId: string,
  listOwnerId: string | null
): Promise<void> {
  await queryDb(`UPDATE products SET supplier_pricelist_id = ? WHERE id = ?`, [
    listOwnerId,
    productId,
  ])
}

export async function clearScopedPricesForProduct(
  listOwnerId: string,
  productId: string
): Promise<void> {
  await queryDb(
    `DELETE FROM seller_product_prices WHERE list_owner_id = ? AND product_id = ?`,
    [listOwnerId, productId]
  )
}
