#!/usr/bin/env npx tsx
/**
 * Process Yupoo import jobs on the VPS (or locally with db:tunnel).
 *
 *   npm run import:worker
 *   npm run import:worker -- --job=<uuid>
 *   npm run import:worker -- --job=<uuid> --refresh
 *   npm run import:worker -- --job=<uuid> --refresh --retry-all
 *
 * Skipped albums already exist for the same brand (source_album_id + brand).
 * --refresh  re-fetch Yupoo and update those products (keeps active/draft status).
 * --retry-all  re-queue imported/skipped job items (finished jobs only).
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { fetchHtml, sleep } from '@/lib/yupoo/client'
import { parseCategoryAlbums } from '@/lib/yupoo/parse-category'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import { translateProductText } from '@/lib/translate'
import type { ImportJobItemRow, ImportSourceRow } from '@/lib/import-db'
import {
  appendJobErrorLog,
  buildProductInputFromImport,
  createImportJobItems,
  getImportJob,
  getImportSource,
  getImportProductByAlbum,
  getQueuedImportJob,
  listPendingJobItems,
  resetCompletedJobItems,
  resetSkippedJobItems,
  touchImportSourceSynced,
  updateImportJob,
  updateJobItem,
} from '@/lib/import-db'
import { insertProduct, updateProduct } from '@/lib/products-db'
import type { ProductInput } from '@/lib/products-db'
import { ensureEnvLoaded } from '@/lib/ensure-env'

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function workerFlags() {
  return {
    refresh: process.argv.includes('--refresh'),
    retryAll: process.argv.includes('--retry-all'),
    retrySkipped: process.argv.includes('--retry-skipped'),
  }
}

async function resolveJobId(): Promise<string | null> {
  const arg = process.argv.find((a) => a.startsWith('--job='))
  if (arg) return arg.split('=')[1] || null
  const queued = await getQueuedImportJob()
  return queued?.id ?? null
}

async function buildImportInput(
  item: ImportJobItemRow,
  source: ImportSourceRow
) {
  const html = await fetchHtml(item.album_url)
  const album = parseAlbumPage(html, item.album_url, item.album_id)

  if (!album.images.length) {
    throw new Error('No images found on album page')
  }

  const translated = await translateProductText(album.title, album.description, 500)

  const input = buildProductInputFromImport(
    album,
    translated,
    source.category_name!,
    source.brand_name ?? null,
    item.album_title ?? album.title
  )

  if (!input.image_url) {
    throw new Error('No images found on album page')
  }

  return { input, album, translated }
}

function inputForRefresh(input: ProductInput): Partial<ProductInput> {
  const { status: _status, featured: _featured, ...rest } = input
  return rest
}

async function processJob(jobId: string) {
  const flags = workerFlags()
  const job = await getImportJob(jobId)
  if (!job) {
    console.error('Job not found:', jobId)
    process.exit(1)
  }

  const source = await getImportSource(job.source_id)
  if (!source) {
    console.error('Source not found for job:', job.source_id)
    process.exit(1)
  }

  if (!source.category_name) {
    console.error('Import source must have catalog_category_id mapped to an active category.')
    process.exit(1)
  }

  if (flags.retryAll) {
    const reset = await resetCompletedJobItems(jobId)
    if (reset > 0) {
      console.log(`==> Re-queued ${reset} imported/skipped albums`)
    }
  } else if (flags.retrySkipped) {
    const reset = await resetSkippedJobItems(jobId)
    if (reset > 0) {
      console.log(`==> Re-queued ${reset} skipped albums`)
    }
  }

  await updateImportJob(jobId, {
    status: 'running',
    started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    ...(flags.retryAll || flags.retrySkipped
      ? { processed: 0, imported: 0, skipped: 0, failed: 0 }
      : {}),
  })

  let items = await listPendingJobItems(jobId)

  if (!items.length && job.total_albums === 0) {
    console.log('==> Fetch category:', source.yupoo_category_url)
    const html = await fetchHtml(source.yupoo_category_url)
    const albums = parseCategoryAlbums(html, source.yupoo_category_url)
    console.log(`==> Found ${albums.length} albums`)
    await createImportJobItems(jobId, albums)
    await updateImportJob(jobId, { total_albums: albums.length })
    items = await listPendingJobItems(jobId)
  }

  if (!items.length && (flags.refresh || flags.retryAll)) {
    console.log('No pending albums. Use --retry-all on a finished job, or start a new sync in admin.')
  }

  if (flags.refresh) {
    console.log('==> Refresh mode: existing albums will be updated from Yupoo (status unchanged)')
  }

  let processed = flags.retryAll || flags.retrySkipped ? 0 : job.processed
  let imported = flags.retryAll || flags.retrySkipped ? 0 : job.imported
  let skipped = flags.retryAll || flags.retrySkipped ? 0 : job.skipped
  let failed = flags.retryAll || flags.retrySkipped ? 0 : job.failed
  let refreshed = 0

  for (const item of items) {
    try {
      const existing = await getImportProductByAlbum(
        item.album_id,
        source.catalog_brand_id,
        source.brand_name ?? null
      )

      if (existing && !flags.refresh) {
        const brandLabel = source.brand_name?.trim() || 'this brand'
        console.log(`==> Album ${item.album_id} (skip — already imported for ${brandLabel})`)
        await updateJobItem(item.id, {
          status: 'skipped',
          product_id: existing.id,
          error_message: null,
        })
        skipped++
        processed++
        await updateImportJob(jobId, { processed, imported, skipped, failed })
        continue
      }

      console.log(
        `==> Album ${item.album_id}${existing && flags.refresh ? ' (refresh)' : ''}`
      )
      await sleep(1200)

      const { input, album, translated } = await buildImportInput(item, source)

      if (existing && flags.refresh) {
        await updateProduct(existing.id, inputForRefresh(input))
        await updateJobItem(item.id, {
          status: 'imported',
          product_id: existing.id,
          raw_json: JSON.stringify({ album, translated, refreshed: true }),
          error_message: translated.translationFailed ? 'Translation failed — kept raw text' : null,
        })
        refreshed++
        processed++
      } else {
        const product = await insertProduct(input)
        const productId = product ? String((product as { id?: string }).id || '') : ''

        await updateJobItem(item.id, {
          status: 'imported',
          product_id: productId || null,
          raw_json: JSON.stringify({ album, translated }),
          error_message: translated.translationFailed ? 'Translation failed — kept raw text' : null,
        })

        imported++
        processed++
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('FAIL:', item.album_id, message)
      await updateJobItem(item.id, { status: 'failed', error_message: message })
      await appendJobErrorLog(jobId, `${item.album_id}: ${message}`)
      failed++
      processed++
    }

    await updateImportJob(jobId, { processed, imported, skipped, failed })
  }

  await updateImportJob(jobId, {
    status: failed > 0 && imported === 0 && refreshed === 0 ? 'failed' : 'done',
    finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  await touchImportSourceSynced(source.id)

  const parts = [`imported=${imported}`, `skipped=${skipped}`, `failed=${failed}`]
  if (refreshed > 0) parts.push(`refreshed=${refreshed}`)
  console.log(`Done. ${parts.join(' ')}`)
}

async function main() {
  loadDotEnv()
  ensureEnvLoaded()

  const jobId = await resolveJobId()
  if (!jobId) {
    console.error('No queued job. Pass --job=<uuid> or create a sync job in admin.')
    process.exit(1)
  }

  await processJob(jobId)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
