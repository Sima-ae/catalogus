#!/usr/bin/env npx tsx
/**
 * Process Yupoo import jobs on the VPS (or locally with db:tunnel).
 *
 *   npm run import:worker
 *   npm run import:worker -- --job=<uuid>
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { fetchHtml, sleep } from '@/lib/yupoo/client'
import { parseCategoryAlbums } from '@/lib/yupoo/parse-category'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import { translateProductText } from '@/lib/translate'
import {
  appendJobErrorLog,
  buildProductInputFromImport,
  createImportJobItems,
  getImportJob,
  getImportSource,
  getProductBySourceAlbumId,
  getQueuedImportJob,
  listPendingJobItems,
  touchImportSourceSynced,
  updateImportJob,
  updateJobItem,
} from '@/lib/import-db'
import { insertProduct } from '@/lib/products-db'
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

async function resolveJobId(): Promise<string | null> {
  const arg = process.argv.find((a) => a.startsWith('--job='))
  if (arg) return arg.split('=')[1] || null
  const queued = await getQueuedImportJob()
  return queued?.id ?? null
}

async function processJob(jobId: string) {
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

  await updateImportJob(jobId, {
    status: 'running',
    started_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
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

  let processed = job.processed
  let imported = job.imported
  let skipped = job.skipped
  let failed = job.failed

  for (const item of items) {
    try {
      const existing = await getProductBySourceAlbumId(item.album_id)
      if (existing) {
        await updateJobItem(item.id, {
          status: 'skipped',
          product_id: existing.id,
          error_message: null,
        })
        skipped++
        processed++
        continue
      }

      console.log(`==> Album ${item.album_id}`)
      await sleep(1200)
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
        source.brand_name ?? null
      )

      if (!input.image_url) {
        throw new Error('No images found on album page')
      }

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
    status: failed > 0 && imported === 0 ? 'failed' : 'done',
    finished_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  })
  await touchImportSourceSynced(source.id)

  console.log(`Done. imported=${imported} skipped=${skipped} failed=${failed}`)
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
