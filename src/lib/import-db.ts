import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'
import type { ProductInput } from '@/lib/products-db'
import { APP_DEFAULT_AUTHOR, APP_DEFAULT_AUTHOR_ICON } from '@/lib/brand'
import { buildSku, parseAttributes } from '@/lib/yupoo/parse-album'
import type { YupooAlbumData } from '@/lib/yupoo/types'
import type { TranslatedProductText } from '@/lib/translate'

export function buildProductInputFromImport(
  album: YupooAlbumData,
  translated: TranslatedProductText,
  categoryName: string,
  brandName: string | null
): ProductInput {
  const attrs = parseAttributes(`${album.title}\n${album.description}`)
  const mainImage = album.images[0] || ''
  const gallery = album.images.slice(1)

  return {
    name: translated.enTitle || album.title,
    description: translated.enDescription || album.description,
    short_description: (translated.enDescription || album.description).slice(0, 280),
    price: 0,
    original_price: null,
    image_url: mainImage,
    gallery_images: gallery.length ? gallery : null,
    category: categoryName,
    brand: brandName,
    available_sizes: attrs.sizes,
    available_colors: attrs.colors,
    source_url: album.albumUrl,
    source_album_id: album.albumId,
    author: APP_DEFAULT_AUTHOR,
    author_icon: APP_DEFAULT_AUTHOR_ICON,
    sku: buildSku(album),
    status: 'draft',
    featured: false,
  }
}

export type ImportSourceRow = {
  id: string
  name: string
  yupoo_category_url: string
  catalog_category_id: string | null
  catalog_brand_id: string | null
  enabled: number | boolean
  last_synced_at: string | null
  category_name?: string | null
  brand_name?: string | null
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
  status: string
  raw_json: string | null
  error_message: string | null
  product_id: string | null
}

export async function listImportSources(): Promise<ImportSourceRow[]> {
  return queryDb<ImportSourceRow[]>(
    `SELECT s.*,
            c.name AS category_name,
            b.name AS brand_name
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

export async function createImportSource(input: {
  name: string
  yupoo_category_url: string
  catalog_category_id?: string | null
  catalog_brand_id?: string | null
}): Promise<ImportSourceRow> {
  const id = randomUUID()
  await queryDb(
    `INSERT INTO import_sources (id, name, yupoo_category_url, catalog_category_id, catalog_brand_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      id,
      input.name.trim(),
      input.yupoo_category_url.trim(),
      input.catalog_category_id || null,
      input.catalog_brand_id || null,
    ]
  )
  return (await getImportSource(id))!
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
  albums: { albumId: string; albumUrl: string }[]
): Promise<void> {
  for (const album of albums) {
    await queryDb(
      `INSERT INTO import_job_items (id, job_id, album_url, album_id, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [randomUUID(), jobId, album.albumUrl, album.albumId]
    )
  }
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

  for (const key of ['status', 'raw_json', 'error_message', 'product_id'] as const) {
    if (patch[key] !== undefined) {
      fields.push(`${key} = ?`)
      values.push(patch[key])
    }
  }

  if (!fields.length) return
  values.push(id)
  await queryDb(`UPDATE import_job_items SET ${fields.join(', ')} WHERE id = ?`, values)
}

export async function getProductBySourceAlbumId(
  albumId: string
): Promise<{ id: string } | null> {
  const rows = await queryDb<{ id: string }[]>(
    `SELECT id FROM products WHERE source_album_id = ? LIMIT 1`,
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
