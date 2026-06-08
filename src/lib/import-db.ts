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
import type {
  WooCommercePriceMode,
  WooProductData,
  WooStoreProduct,
} from '@/lib/woocommerce/types'
import { normalizeWooCommercePriceMode } from '@/lib/woocommerce/types'
import {
  listWooStoreProducts,
  wooProductsToJobItems,
  parseWooProductSlugFromUrl,
  normalizeWooCommerceStoreUrl,
} from '@/lib/woocommerce/client'
import { mirrorWooCommerceProductImages } from '@/lib/woocommerce/mirror-images'
import { wooSlugExternalId } from '@/lib/woocommerce/types'
import { mirrorFacebookPostImages } from '@/lib/facebook/mirror-images'
import { mapFacebookPost } from '@/lib/facebook/map-product'
import type {
  FacebookJobItemRawJson,
  FacebookManualImportFields,
  FacebookPostData,
} from '@/lib/facebook/types'
import { canonicalizeFacebookUrl, facebookExternalIdFromUrl, normalizeFacebookPostUrl } from '@/lib/facebook/parse-url'
import { discoverAllLkxoxListItems, lkxoxListItemsToJobItems } from '@/lib/lkxox/parse-listing'
import { mirrorLkxoxProductImages } from '@/lib/lkxox/mirror-images'
import type { LkxoxProductData } from '@/lib/lkxox/types'
import { normalizeLkxoxListUrl } from '@/lib/lkxox/client'
import { resolveOrCreateImportBrand } from '@/lib/woocommerce/resolve-catalog'

export type ImportSourceType = 'yupoo' | 'woocommerce' | 'facebook' | 'lkxox'

export function normalizeImportSourceType(value: string | null | undefined): ImportSourceType {
  const raw = String(value ?? '').trim().toLowerCase()
  if (raw === 'woocommerce') return 'woocommerce'
  if (raw === 'facebook') return 'facebook'
  if (raw === 'lkxox') return 'lkxox'
  return 'yupoo'
}

export function isWooCommerceImportSource(source: { source_type?: string | null }): boolean {
  return normalizeImportSourceType(source.source_type) === 'woocommerce'
}

export function isFacebookImportSource(source: { source_type?: string | null }): boolean {
  return normalizeImportSourceType(source.source_type) === 'facebook'
}

export function isLkxoxImportSource(source: { source_type?: string | null }): boolean {
  return normalizeImportSourceType(source.source_type) === 'lkxox'
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
  },
  priceMode: WooCommercePriceMode = 'storefront'
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

  const usePurchasePrice = priceMode === 'purchase_price'

  return {
    name,
    description,
    short_description,
    price: usePurchasePrice ? 0 : woo.price,
    original_price: usePurchasePrice ? null : woo.originalPrice,
    ...(usePurchasePrice && woo.price > 0 ? { purchase_price: woo.price } : {}),
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
  const mirroredUrls = await mirrorWooCommerceProductImages(woo.externalId, woo.imageUrls)
  const wooWithLocalImages = { ...woo, imageUrls: mirroredUrls }
  const catalog = await resolveImportCatalogMapping(wooWithLocalImages, {
    catalogCategoryId: source.catalog_category_id,
    catalogCategoryName: source.category_name ?? null,
    catalogBrandId: source.catalog_brand_id,
    catalogBrandName: source.brand_name ?? null,
  })
  return buildProductInputFromWooCommerceImport(
    wooWithLocalImages,
    {
      categoryName: catalog.categoryName,
      categoryId: catalog.categoryId,
      brandName: catalog.brandName,
    },
    normalizeWooCommercePriceMode(source.woocommerce_price_mode)
  )
}

export function parseFacebookJobItemManual(rawJson: string | null | undefined): FacebookManualImportFields | null {
  if (!rawJson?.trim()) return null
  try {
    const parsed = JSON.parse(rawJson) as FacebookJobItemRawJson
    const manual = parsed?.manual
    if (!manual?.sku?.trim() || !manual.category_id?.trim() || !manual.category?.trim()) {
      return null
    }
    const price = Number(manual.price)
    if (!Number.isFinite(price) || price < 0) return null
    return {
      price,
      sku: manual.sku.trim(),
      category_id: manual.category_id.trim(),
      category: manual.category.trim(),
      brand: manual.brand?.trim() || null,
    }
  } catch {
    return null
  }
}

export async function buildProductInputFromFacebookPost(
  post: FacebookPostData,
  manual: FacebookManualImportFields,
  mirroredImageUrls: string[]
): Promise<ProductInput> {
  const mapped = mapFacebookPost(post)
  const uniqueImages = cleanProductGalleryUrls(mirroredImageUrls)
  const mainImage = uniqueImages[0] || ''
  const gallery = uniqueImages.slice(1)
  const name = sanitizeProductName(mapped.title || 'Facebook import')
  const description = cleanImportDescription(mapped.description, name, manual.brand)
  const short_description =
    catalogCardDescription(name, description, undefined, manual.brand).slice(0, 280) || undefined

  return {
    name,
    description,
    short_description,
    price: manual.price,
    original_price: null,
    image_url: mainImage,
    gallery_images: gallery.length ? gallery : null,
    category: manual.category,
    category_id: manual.category_id,
    brand: manual.brand,
    source_url: mapped.postUrl,
    source_album_id: mapped.externalId,
    author: APP_DEFAULT_AUTHOR,
    author_icon: APP_DEFAULT_AUTHOR_ICON,
    sku: manual.sku,
    status: 'draft',
    featured: false,
  }
}

export async function buildProductInputFromFacebookJobItem(
  item: ImportJobItemRow,
  post: FacebookPostData
): Promise<ProductInput> {
  const manual = parseFacebookJobItemManual(item.raw_json)
  if (!manual) {
    throw new Error('Missing manual import fields on job item (price, category, brand)')
  }
  const mirroredUrls = await mirrorFacebookPostImages(post.externalId, post.imageUrls)
  return buildProductInputFromFacebookPost(post, manual, mirroredUrls)
}

export async function buildProductInputFromLkxoxImport(
  lkxox: LkxoxProductData,
  catalog: {
    categoryName: string
    categoryId: string | null
    brandName: string | null
  }
): Promise<ProductInput> {
  const uniqueImages = cleanProductGalleryUrls(lkxox.imageUrls)
  const mainImage = uniqueImages[0] || ''
  const gallery = uniqueImages.slice(1)
  const name = sanitizeProductName(lkxox.name)
  const description = cleanImportDescription(lkxox.description, name, catalog.brandName)
  const short_description =
    catalogCardDescription(name, description, undefined, catalog.brandName).slice(0, 280) ||
    undefined

  return {
    name,
    description,
    short_description,
    price: 0,
    original_price: lkxox.originalPrice,
    purchase_price: lkxox.purchasePrice,
    image_url: mainImage,
    gallery_images: gallery.length ? gallery : null,
    category: catalog.categoryName,
    category_id: catalog.categoryId,
    brand: catalog.brandName,
    source_url: lkxox.permalink,
    source_album_id: lkxox.externalId,
    author: APP_DEFAULT_AUTHOR,
    author_icon: APP_DEFAULT_AUTHOR_ICON,
    sku: lkxox.sku,
    status: 'draft',
    featured: false,
  }
}

async function resolveLkxoxImportCatalog(
  lkxox: LkxoxProductData,
  source: ImportSourceRow
): Promise<{ categoryName: string; categoryId: string | null; brandName: string | null }> {
  const categoryName = String(source.category_name ?? '').trim() || 'Uncategorized'
  const categoryId = source.catalog_category_id?.trim() || null

  let brandName = source.brand_name?.trim() || null
  if (lkxox.brandName) {
    const resolved = await resolveOrCreateImportBrand(lkxox.brandName)
    if (resolved) brandName = resolved.name
  }

  return { categoryName, categoryId, brandName }
}

export async function buildProductInputFromLkxoxProduct(
  lkxox: LkxoxProductData,
  source: ImportSourceRow
): Promise<ProductInput> {
  const mirroredUrls = await mirrorLkxoxProductImages(lkxox.externalId, lkxox.imageUrls)
  const lkxoxWithLocalImages = { ...lkxox, imageUrls: mirroredUrls }
  const catalog = await resolveLkxoxImportCatalog(lkxoxWithLocalImages, source)
  return buildProductInputFromLkxoxImport(lkxoxWithLocalImages, catalog)
}

export type ImportSourceRow = {
  id: string
  name: string
  source_type?: string | null
  yupoo_category_url: string | null
  yupoo_access_password?: string | null
  woocommerce_store_url?: string | null
  woocommerce_category_slug?: string | null
  woocommerce_price_mode?: string | null
  catalog_list_url?: string | null
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

function normalizeLkxoxListUrlForSource(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return null
  return normalizeLkxoxListUrl(trimmed)
}

export function resolveLkxoxListUrl(source: ImportSourceRow): string {
  const fromSource = String(source.catalog_list_url ?? '').trim()
  if (fromSource) return normalizeLkxoxListUrl(fromSource)
  throw new Error('Lkxox catalog list URL is required on the import source')
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
  woocommerce_price_mode?: string | null
  catalog_list_url?: string | null
  catalog_category_id?: string | null
  catalog_brand_id?: string | null
}): Promise<ImportSourceRow> {
  const id = randomUUID()
  const pwd = normalizeImportSourcePassword(input.yupoo_access_password)
  const sourceType = normalizeImportSourceType(input.source_type)
  await queryDb(
    `INSERT INTO import_sources (
       id, name, source_type, yupoo_category_url, yupoo_access_password,
       woocommerce_store_url, woocommerce_category_slug, woocommerce_price_mode,
       catalog_list_url, catalog_category_id, catalog_brand_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      sourceType,
      input.yupoo_category_url?.trim() || null,
      pwd,
      normalizeWooStoreUrlForSource(input.woocommerce_store_url),
      input.woocommerce_category_slug?.trim() || null,
      normalizeWooCommercePriceMode(input.woocommerce_price_mode),
      normalizeLkxoxListUrlForSource(input.catalog_list_url),
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
    woocommerce_price_mode?: string | null
    catalog_list_url?: string | null
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
    'woocommerce_price_mode = ?',
    'catalog_list_url = ?',
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
    normalizeWooCommercePriceMode(input.woocommerce_price_mode),
    normalizeLkxoxListUrlForSource(input.catalog_list_url),
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

export async function createImportJobItemsFromLkxoxProducts(
  jobId: string,
  products: { externalId: string; permalink: string; title: string }[]
): Promise<void> {
  return createImportJobItemsFromWooProducts(jobId, products)
}

export async function discoverLkxoxJobItems(
  source: ImportSourceRow
): Promise<{ externalId: string; permalink: string; title: string }[]> {
  const listUrl = resolveLkxoxListUrl(source)
  const items = await discoverAllLkxoxListItems(listUrl)
  return lkxoxListItemsToJobItems(items)
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

export async function createSingleFacebookPostImportJob(
  source: ImportSourceRow,
  postUrl: string,
  manual: FacebookManualImportFields
): Promise<ImportJobRow> {
  if (!isFacebookImportSource(source)) {
    throw new Error('Single post import is only supported for Facebook sources')
  }

  const normalizedUrl = canonicalizeFacebookUrl(postUrl)
  const externalId = facebookExternalIdFromUrl(normalizedUrl)
  const rawJson: FacebookJobItemRawJson = { manual }

  const job = await createImportJob(source.id)
  await queryDb(
    `INSERT INTO import_job_items (id, job_id, album_url, album_id, album_title, status, raw_json)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [
      randomUUID(),
      job.id,
      normalizedUrl,
      externalId,
      manual.sku.slice(0, 128),
      JSON.stringify(rawJson),
    ]
  )
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
