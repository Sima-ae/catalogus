import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import type { ProductInput } from '@/lib/products-db'
import { APP_DEFAULT_AUTHOR, APP_DEFAULT_AUTHOR_ICON } from '@/lib/brand'
import { cleanProductGalleryUrls } from '@/lib/product-image-url'
import { buildSku, parseAttributes } from '@/lib/yupoo/parse-album'
import {
  catalogCardDescription,
  cleanImportDescription,
  sanitizeProductName,
} from '@/lib/yupoo/import-text'
import { resolveYupooProductTitleAsync } from '@/lib/yupoo/product-title'
import type { YupooAlbumData } from '@/lib/yupoo/types'
import type { TranslatedProductText } from '@/lib/translate'
import { mapWooStoreProduct } from '@/lib/woocommerce/map-product'
import { resolveImportCatalogMapping } from '@/lib/woocommerce/resolve-catalog'
import type { WooProductData, WooStoreProduct } from '@/lib/woocommerce/types'
import {
  listWooStoreProducts,
  wooProductsToJobItems,
  parseWooProductSlugFromUrl,
  normalizeWooCommerceStoreUrl,
} from '@/lib/woocommerce/client'
import { wooSlugExternalId } from '@/lib/woocommerce/types'

export type ImportSourceType = 'yupoo' | 'woocommerce'

export function normalizeImportSourceType(value: string | null | undefined): ImportSourceType {
  return String(value ?? '').trim().toLowerCase() === 'woocommerce' ? 'woocommerce' : 'yupoo'
}

export function isWooCommerceImportSource(source: { source_type?: string | null }): boolean {
  return normalizeImportSourceType(source.source_type) === 'woocommerce'
}

export async function buildProductInputFromImport(
  album: YupooAlbumData,
  translated: TranslatedProductText,
  categoryName: string,
  brandName: string | null,
  thumbTitle?: string | null,
  catalogCategoryId?: string | null
): Promise<ProductInput> {
  const attrs = parseAttributes(`${album.title}\n${album.description}`)
  const uniqueImages = cleanProductGalleryUrls(album.images)
  const mainImage = uniqueImages[0] || ''
  const gallery = uniqueImages.slice(1)
  const sku = buildSku(album, brandName)

  const rawTitle = translated.rawTitle || album.title
  const rawDescription = translated.enDescription || album.description
  const name = sanitizeProductName(
    await resolveYupooProductTitleAsync({
      albumTitle: rawTitle,
      description: album.description,
      thumbTitle,
      fallbackSku: sku,
      fallbackAlbumId: album.albumId,
    })
  )
  const description = cleanImportDescription(rawDescription, name, brandName)
  const short_description =
    catalogCardDescription(name, description, undefined, brandName).slice(0, 280) ||
    undefined

  return {
    name,
    description,
    short_description,
    price: 0,
    original_price: null,
    image_url: mainImage,
    gallery_images: gallery.length ? gallery : null,
    category: categoryName,
    category_id: catalogCategoryId?.trim() || null,
    brand: brandName,
    available_sizes: attrs.sizes,
    available_colors: attrs.colors,
    source_url: album.albumUrl,
    source_album_id: album.albumId,
    author: APP_DEFAULT_AUTHOR,
    author_icon: APP_DEFAULT_AUTHOR_ICON,
    sku,
    status: 'draft',
    featured: false,
  }
}

export async function buildProductInputFromWooCommerceImport(
  woo: WooProductData,
  catalog: {
    categoryName: string
    categoryId: string | null
    brandName: string | null
  }
): Promise<ProductInput> {
  const uniqueImages = cleanProductGalleryUrls(woo.imageUrls)
  const mainImage = uniqueImages[0] || ''
  const gallery = uniqueImages.slice(1)
  const name = sanitizeProductName(woo.name)
  const description = cleanImportDescription(
    woo.description || woo.shortDescription,
    name,
    catalog.brandName
  )
  const short_description =
    catalogCardDescription(
      name,
      description || woo.shortDescription,
      undefined,
      catalog.brandName
    ).slice(0, 280) || undefined

  return {
    name,
    description,
    short_description,
    price: woo.price,
    original_price: woo.originalPrice,
    image_url: mainImage,
    gallery_images: gallery.length ? gallery : null,
    category: catalog.categoryName,
    category_id: catalog.categoryId,
    brand: catalog.brandName,
    source_url: woo.permalink,
    source_album_id: woo.externalId,
    author: APP_DEFAULT_AUTHOR,
    author_icon: APP_DEFAULT_AUTHOR_ICON,
    sku: woo.sku,
    status: 'draft',
    featured: false,
  }
}

export async function buildProductInputFromWooStoreProduct(
  product: WooStoreProduct,
  source: ImportSourceRow
): Promise<ProductInput> {
  const woo = mapWooStoreProduct(product)
  const catalog = await resolveImportCatalogMapping(woo, {
    catalogCategoryId: source.catalog_category_id,
    catalogCategoryName: source.category_name ?? null,
    catalogBrandId: source.catalog_brand_id,
    catalogBrandName: source.brand_name ?? null,
  })
  return buildProductInputFromWooCommerceImport(woo, {
    categoryName: catalog.categoryName,
    categoryId: catalog.categoryId,
    brandName: catalog.brandName,
  })
}

export type ImportSourceRow = {
  id: string
  name: string
  source_type?: string | null
  yupoo_category_url: string | null
  yupoo_access_password?: string | null
  woocommerce_store_url?: string | null
  woocommerce_category_slug?: string | null
  catalog_category_id: string | null
  catalog_brand_id: string | null
  enabled: number | boolean
  last_synced_at: string | null
  category_name?: string | null
  brand_name?: string | null
  /** Skipped albums on the latest import job for this source. */
  skipped_items?: number
}

/** API-safe import source (password never returned). */
export type ImportSourcePublic = Omit<ImportSourceRow, 'yupoo_access_password'> & {
  hasPassword: boolean
}

export function toImportSourcePublic(row: ImportSourceRow): ImportSourcePublic {
  const { yupoo_access_password, ...rest } = row
  const pwd = String(yupoo_access_password ?? '').trim()
  return { ...rest, hasPassword: pwd.length > 0 }
}

export type ImportJobRow = {
  id: string
  source_id: string
  status: string
  total_albums: number
  processed: number
  imported: number
  skipped: number
  failed: number
  error_log: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
}

export type ImportJobItemRow = {
  id: string
  job_id: string
  album_url: string
  album_id: string
  album_title?: string | null
  status: string
  raw_json: string | null
  error_message: string | null
  product_id: string | null
}

export async function listImportSources(): Promise<ImportSourceRow[]> {
  return queryDb<ImportSourceRow[]>(
    `SELECT s.*,
            c.name AS category_name,
            b.name AS brand_name,
            (
              SELECT COUNT(*)
              FROM import_job_items i
              WHERE i.job_id = (
                SELECT j2.id
                FROM import_jobs j2
                WHERE j2.source_id = s.id
                ORDER BY j2.created_at DESC
                LIMIT 1
              )
              AND i.status = 'skipped'
            ) AS skipped_items
     FROM import_sources s
     LEFT JOIN categories c ON c.id = s.catalog_category_id
     LEFT JOIN brands b ON b.id = s.catalog_brand_id
     ORDER BY s.created_at DESC`
  )
}

export async function getImportSource(id: string): Promise<ImportSourceRow | null> {
  const rows = await queryDb<ImportSourceRow[]>(
    `SELECT s.*,
            c.name AS category_name,
            b.name AS brand_name
     FROM import_sources s
     LEFT JOIN categories c ON c.id = s.catalog_category_id
     LEFT JOIN brands b ON b.id = s.catalog_brand_id
     WHERE s.id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

function normalizeWooStoreUrlForSource(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return null
  return normalizeWooCommerceStoreUrl(trimmed)
}

/** Resolve store root for API calls (fixes legacy rows that saved a /product/ URL). */
export function resolveWooStoreUrl(
  source: ImportSourceRow,
  productUrl?: string | null
): string {
  const fromSource = String(source.woocommerce_store_url ?? '').trim()
  if (fromSource) {
    try {
      return normalizeWooCommerceStoreUrl(fromSource)
    } catch {
      /* try product URL origin below */
    }
  }
  const fromProduct = String(productUrl ?? '').trim()
  if (fromProduct) {
    return normalizeWooCommerceStoreUrl(fromProduct)
  }
  throw new Error('WooCommerce store URL is required on the import source')
}

export async function createImportSource(input: {
  name: string
  source_type?: ImportSourceType
  yupoo_category_url?: string | null
  yupoo_access_password?: string | null
  woocommerce_store_url?: string | null
  woocommerce_category_slug?: string | null
  catalog_category_id?: string | null
  catalog_brand_id?: string | null
}): Promise<ImportSourceRow> {
  const id = randomUUID()
  const pwd = normalizeImportSourcePassword(input.yupoo_access_password)
  const sourceType = normalizeImportSourceType(input.source_type)
  await queryDb(
    `INSERT INTO import_sources (
       id, name, source_type, yupoo_category_url, yupoo_access_password,
       woocommerce_store_url, woocommerce_category_slug,
       catalog_category_id, catalog_brand_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      sourceType,
      input.yupoo_category_url?.trim() || null,
      pwd,
      normalizeWooStoreUrlForSource(input.woocommerce_store_url),
      input.woocommerce_category_slug?.trim() || null,
      input.catalog_category_id || null,
      input.catalog_brand_id || null,
    ]
  )
  return (await getImportSource(id))!
}

export async function updateImportSource(
  id: string,
  input: {
    name: string
    source_type?: ImportSourceType
    yupoo_category_url?: string | null
    yupoo_access_password?: string | null | undefined
    clear_yupoo_access_password?: boolean
    woocommerce_store_url?: string | null
    woocommerce_category_slug?: string | null
    catalog_category_id?: string | null
    catalog_brand_id?: string | null
  }
): Promise<ImportSourceRow | null> {
  const pwd = resolveImportSourcePasswordUpdate(input)
  const sourceType = input.source_type
    ? normalizeImportSourceType(input.source_type)
    : undefined

  const fields = [
    'name = ?',
    ...(sourceType ? ['source_type = ?'] : []),
    'yupoo_category_url = ?',
    ...(pwd !== undefined ? ['yupoo_access_password = ?'] : []),
    'woocommerce_store_url = ?',
    'woocommerce_category_slug = ?',
    'catalog_category_id = ?',
    'catalog_brand_id = ?',
  ]
  const values: unknown[] = [
    input.name.trim(),
    ...(sourceType ? [sourceType] : []),
    input.yupoo_category_url?.trim() || null,
    ...(pwd !== undefined ? [pwd] : []),
    normalizeWooStoreUrlForSource(input.woocommerce_store_url),
    input.woocommerce_category_slug?.trim() || null,
    input.catalog_category_id || null,
    input.catalog_brand_id || null,
    id,
  ]

  await queryDb(`UPDATE import_sources SET ${fields.join(', ')} WHERE id = ?`, values)
  return getImportSource(id)
}

function normalizeImportSourcePassword(value: string | null | undefined): string | null {
  const pwd = String(value ?? '').trim()
  return pwd || null
}

function resolveImportSourcePasswordUpdate(input: {
  yupoo_access_password?: string | null | undefined
  clear_yupoo_access_password?: boolean
}): string | null | undefined {
  if (input.clear_yupoo_access_password) return null
  if (input.yupoo_access_password === undefined) return undefined
  return normalizeImportSourcePassword(input.yupoo_access_password)
}

export async function deleteImportSource(id: string): Promise<boolean> {
  const result = await queryDb<{ affectedRows?: number }>(
    `DELETE FROM import_sources WHERE id = ?`,
    [id]
  )
  return (result?.affectedRows ?? 0) > 0
}

export async function createImportJob(sourceId: string): Promise<ImportJobRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO import_jobs (id, source_id, status) VALUES (?, ?, 'queued')`,
    [id, sourceId]
  )
  return (await getImportJob(id))!
}

export async function getImportJob(id: string): Promise<ImportJobRow | null> {
  const rows = await queryDb<ImportJobRow[]>(
    `SELECT * FROM import_jobs WHERE id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function getQueuedImportJob(): Promise<ImportJobRow | null> {
  const rows = await queryDb<ImportJobRow[]>(
    `SELECT * FROM import_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`
  )
  return rows[0] ?? null
}

export async function updateImportJob(
  id: string,
  patch: Partial<ImportJobRow>
): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []

  for (const key of [
    'status',
    'total_albums',
    'processed',
    'imported',
    'skipped',
    'failed',
    'error_log',
    'started_at',
    'finished_at',
  ] as const) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = ?`)
      values.push(patch[key])
    }
  }

  if (!fields.length) return
  values.push(id)
  await queryDb(`UPDATE import_jobs SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function appendJobErrorLog(jobId: string, message: string): Promise<void> {
  const job = await getImportJob(jobId)
  const prev = job?.error_log?.trim() || ''
  const next = prev ? `${prev}\n${message}` : message
  await updateImportJob(jobId, { error_log: next.slice(-8000) })
}

export async function createImportJobItems(
  jobId: string,
  albums: { albumId: string; albumUrl: string; thumbTitle?: string }[]
): Promise<void> {
  for (const album of albums) {
    const title = album.thumbTitle?.trim() || null
    try {
      await queryDb(
        `INSERT INTO import_job_items (id, job_id, album_url, album_id, album_title, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [randomUUID(), jobId, album.albumUrl, album.albumId, title]
      )
    } catch {
      await queryDb(
        `INSERT INTO import_job_items (id, job_id, album_url, album_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [randomUUID(), jobId, album.albumUrl, album.albumId]
      )
    }
  }
}

export async function createImportJobItemsFromWooProducts(
  jobId: string,
  products: { externalId: string; permalink: string; title: string }[]
): Promise<void> {
  for (const product of products) {
    try {
      await queryDb(
        `INSERT INTO import_job_items (id, job_id, album_url, album_id, album_title, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [randomUUID(), jobId, product.permalink, product.externalId, product.title || null]
      )
    } catch {
      await queryDb(
        `INSERT INTO import_job_items (id, job_id, album_url, album_id, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [randomUUID(), jobId, product.permalink, product.externalId]
      )
    }
  }
}

export async function discoverWooCommerceJobItems(
  source: ImportSourceRow
): Promise<{ externalId: string; permalink: string; title: string }[]> {
  const storeUrl = resolveWooStoreUrl(source)
  const products = await listWooStoreProducts(storeUrl, {
    categorySlug: source.woocommerce_category_slug,
  })
  return wooProductsToJobItems(products)
}

export async function createSingleWooProductImportJob(
  source: ImportSourceRow,
  productUrl: string
): Promise<ImportJobRow> {
  if (!isWooCommerceImportSource(source)) {
    throw new Error('Single product URL import is only supported for WooCommerce sources')
  }
  const trimmedProductUrl = productUrl.trim()
  const storeUrl = resolveWooStoreUrl(source, trimmedProductUrl)
  const slug = parseWooProductSlugFromUrl(trimmedProductUrl, storeUrl)
  const cleanUrl = trimmedProductUrl.split('?')[0].replace(/\/+$/, '') + '/'

  const job = await createImportJob(source.id)
  await createImportJobItemsFromWooProducts(job.id, [
    {
      externalId: wooSlugExternalId(slug),
      permalink: cleanUrl,
      title: slug,
    },
  ])
  await updateImportJob(job.id, { total_albums: 1 })
  return (await getImportJob(job.id))!
}

export async function listPendingJobItems(jobId: string): Promise<ImportJobItemRow[]> {
  return queryDb<ImportJobItemRow[]>(
    `SELECT * FROM import_job_items
     WHERE job_id = ? AND status IN ('pending', 'failed')
     ORDER BY created_at ASC`,
    [jobId]
  )
}

export async function updateJobItem(
  id: string,
  patch: Partial<ImportJobItemRow>
): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []

  for (const key of ['status', 'raw_json', 'error_message', 'product_id', 'album_id'] as const) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = ?`)
      values.push(patch[key])
    }
  }

  if (!fields.length) return
  values.push(id)
  await queryDb(`UPDATE import_job_items SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function findLatestImportJobForSource(
  sourceId: string
): Promise<ImportJobRow | null> {
  const rows = await queryDb<ImportJobRow[]>(
    `SELECT * FROM import_jobs WHERE source_id = ? ORDER BY created_at DESC LIMIT 1`,
    [sourceId]
  )
  return rows[0] ?? null
}

export async function countRefreshableJobItems(jobId: string): Promise<number> {
  const rows = await queryDb<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM import_job_items
     WHERE job_id = ? AND status IN ('imported', 'skipped')`,
    [jobId]
  )
  return Number(rows[0]?.n ?? 0)
}

export async function queueRefreshAllImport(jobId: string): Promise<number> {
  const reset = await resetCompletedJobItems(jobId)
  await updateImportJob(jobId, {
    status: 'queued',
    processed: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    error_log: null,
    started_at: null,
    finished_at: null,
  })
  return reset
}

export async function findImportJobWithSkippedItems(
  sourceId: string
): Promise<ImportJobRow | null> {
  const rows = await queryDb<ImportJobRow[]>(
    `SELECT j.*
     FROM import_jobs j
     WHERE j.source_id = ?
       AND EXISTS (
         SELECT 1 FROM import_job_items i
         WHERE i.job_id = j.id AND i.status = 'skipped'
       )
     ORDER BY j.created_at DESC
     LIMIT 1`,
    [sourceId]
  )
  return rows[0] ?? null
}

export async function countSkippedJobItems(jobId: string): Promise<number> {
  const rows = await queryDb<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM import_job_items WHERE job_id = ? AND status = 'skipped'`,
    [jobId]
  )
  return Number(rows[0]?.n ?? 0)
}

export async function queueRetrySkippedImport(jobId: string): Promise<number> {
  const reset = await resetSkippedJobItems(jobId)
  await updateImportJob(jobId, {
    status: 'queued',
    processed: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    error_log: null,
    started_at: null,
    finished_at: null,
  })
  return reset
}

export async function resetSkippedJobItems(jobId: string): Promise<number> {
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE import_job_items SET status = 'pending', error_message = NULL
     WHERE job_id = ? AND status = 'skipped'`,
    [jobId]
  )
  return result?.affectedRows ?? 0
}

/** Re-queue imported + skipped items so a finished job can run again (use with --refresh). */
export async function resetCompletedJobItems(jobId: string): Promise<number> {
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE import_job_items SET status = 'pending', error_message = NULL
     WHERE job_id = ? AND status IN ('skipped', 'imported')`,
    [jobId]
  )
  return result?.affectedRows ?? 0
}

/** @deprecated Prefer findProductByAlbumSku / findProductBySku — duplicates are keyed by SKU. */
export async function getImportProductByAlbum(
  albumId: string,
  brandId: string | null | undefined,
  brandName: string | null | undefined,
  excludeProductId?: string | null
): Promise<{ id: string; status: string } | null> {
  const bid = brandId?.trim() || null
  const bname = brandName?.trim() || null
  const exclude = excludeProductId?.trim() || null
  const excludeSql = exclude ? ' AND id <> ?' : ''
  const excludeParam = exclude ? [exclude] : []

  if (bid) {
    const rows = await queryDb<{ id: string; status: string }[]>(
      `SELECT id, status FROM products
       WHERE source_album_id = ? AND brand_id = ?${excludeSql}
       ORDER BY CASE WHEN status = 'trash' THEN 1 ELSE 0 END, created_at ASC
       LIMIT 1`,
      [albumId, bid, ...excludeParam]
    )
    if (rows[0]) return rows[0]
  }

  if (bname) {
    const rows = await queryDb<{ id: string; status: string }[]>(
      `SELECT id, status FROM products
       WHERE source_album_id = ? AND LOWER(TRIM(brand)) = LOWER(?)${excludeSql}
       ORDER BY CASE WHEN status = 'trash' THEN 1 ELSE 0 END, created_at ASC
       LIMIT 1`,
      [albumId, bname, ...excludeParam]
    )
    if (rows[0]) return rows[0]
  }

  if (!bid && !bname) {
    const rows = await queryDb<{ id: string; status: string }[]>(
      `SELECT id, status FROM products
       WHERE source_album_id = ?
         AND (brand IS NULL OR TRIM(brand) = '')
         AND (brand_id IS NULL OR TRIM(brand_id) = '')
       LIMIT 1`,
      [albumId]
    )
    return rows[0] ?? null
  }

  return null
}

/** @deprecated Use getImportProductByAlbum — album alone is not unique across brands. */
export async function getProductBySourceAlbumId(
  albumId: string
): Promise<{ id: string; status: string } | null> {
  const rows = await queryDb<{ id: string; status: string }[]>(
    `SELECT id, status FROM products WHERE source_album_id = ? LIMIT 1`,
    [albumId]
  )
  return rows[0] ?? null
}

export async function publishImportProduct(productId: string): Promise<void> {
  await queryDb(`UPDATE products SET status = 'active' WHERE id = ?`, [productId])
}

export async function bulkPublishImportProducts(productIds: string[]): Promise<number> {
  if (!productIds.length) return 0
  const placeholders = productIds.map(() => '?').join(', ')
  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE products SET status = 'active'
     WHERE id IN (${placeholders}) AND status = 'draft' AND source_album_id IS NOT NULL`,
    productIds
  )
  return result?.affectedRows ?? 0
}

export async function touchImportSourceSynced(sourceId: string): Promise<void> {
  await queryDb(`UPDATE import_sources SET last_synced_at = NOW() WHERE id = ?`, [sourceId])
}
