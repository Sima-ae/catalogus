#!/usr/bin/env npx tsx
/**
 * Backfill products.source_album_date from Yupoo album datePublished.
 *
 * Optimized for large catalogs (tens of thousands of products):
 * - One paginated pass over products (no per-row job-item queries)
 * - Bulk CASE updates in batches
 * - --fetch dedupes URLs and fetches in parallel (default concurrency 16)
 *
 *   npm run db:backfill-yupoo-dates
 *   npm run db:backfill-yupoo-dates -- --dry-run
 *   npm run db:backfill-yupoo-dates -- --fetch
 *   npm run db:backfill-yupoo-dates -- --fetch --concurrency=24
 *   npm run db:backfill-yupoo-dates -- --limit=5000
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { normalizeYupooAlbumDate, parseYupooAlbumDateFromHtml } from '@/lib/yupoo/parse-album-date'
import { fetchHtml } from '@/lib/yupoo/client'

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
    if (process.env[key] === undefined) process.env[key] = val
  }
}

type ProductRow = {
  id: string
  source_url: string | null
  source_album_id: string | null
}

type JobItemRow = {
  product_id: string
  album_url: string | null
  raw_json: string | null
  updated_at: string
}

type PendingProduct = ProductRow & {
  fetchUrl: string | null
}

function parseArgInt(name: string, fallback: number): number {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`))
  if (!arg) return fallback
  const n = Number(arg.slice(name.length + 1))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function albumDateFromRawJson(raw: string | null): string | null {
  if (!raw?.trim()) return null
  try {
    const parsed = JSON.parse(raw) as { album?: { albumDate?: string | null } }
    const fromField = normalizeYupooAlbumDate(parsed.album?.albumDate)
    if (fromField) return fromField
  } catch {
    // fall through
  }
  const embedded = raw.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"/)
  return embedded?.[1] ?? null
}

function resolveFetchUrl(product: ProductRow, job?: JobItemRow): string | null {
  return job?.album_url?.trim() || product.source_url?.trim() || null
}

async function columnExists(): Promise<boolean> {
  const rows = await queryDb<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'source_album_date'`
  )
  return Number(rows[0]?.n ?? 0) > 0
}

async function countPending(): Promise<number> {
  const rows = await queryDb<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM products
     WHERE source_album_id IS NOT NULL
       AND TRIM(source_album_id) != ''
       AND source_album_date IS NULL`
  )
  return Number(rows[0]?.n ?? 0)
}

async function loadProductChunk(offset: number, chunkSize: number): Promise<ProductRow[]> {
  return queryDb<ProductRow[]>(
    `SELECT id, source_url, source_album_id
     FROM products
     WHERE source_album_id IS NOT NULL
       AND TRIM(source_album_id) != ''
       AND source_album_date IS NULL
     ORDER BY id ASC
     LIMIT ? OFFSET ?`,
    [chunkSize, offset]
  )
}

async function loadLatestJobItems(productIds: string[]): Promise<Map<string, JobItemRow>> {
  const map = new Map<string, JobItemRow>()
  if (!productIds.length) return map

  const placeholders = productIds.map(() => '?').join(', ')
  const rows = await queryDb<JobItemRow[]>(
    `SELECT product_id, album_url, raw_json, updated_at
     FROM import_job_items
     WHERE product_id IN (${placeholders})
     ORDER BY product_id ASC, updated_at DESC`,
    productIds
  )

  for (const row of rows) {
    const id = String(row.product_id)
    if (!map.has(id)) map.set(id, row)
  }
  return map
}

async function bulkApplyDates(
  updates: { id: string; albumDate: string }[],
  batchSize: number,
  dryRun: boolean
): Promise<number> {
  if (!updates.length || dryRun) return updates.length

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    const cases = batch.map(() => 'WHEN ? THEN ?').join(' ')
    const ids = batch.map((u) => u.id)
    const params: string[] = []
    for (const u of batch) {
      params.push(u.id, u.albumDate)
    }
    params.push(...ids)
    await queryDb(
      `UPDATE products SET source_album_date = CASE id ${cases} ELSE source_album_date END
       WHERE id IN (${ids.map(() => '?').join(',')})`,
      params
    )
  }
  return updates.length
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (!items.length) return
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      await worker(items[index]!, index)
    }
  })
  await Promise.all(runners)
}

async function fetchDatesForUrls(
  urls: string[],
  concurrency: number,
  onProgress: (done: number, total: number, failures: number) => void
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()
  let done = 0
  let failures = 0

  await runPool(urls, concurrency, async (url) => {
    try {
      const html = await fetchHtml(url)
      results.set(url, parseYupooAlbumDateFromHtml(html))
    } catch {
      failures++
      results.set(url, null)
    } finally {
      done++
      if (done % 250 === 0 || done === urls.length) {
        onProgress(done, urls.length, failures)
      }
    }
  })

  return results
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')
  const fetchRemote = process.argv.includes('--fetch')
  const limit = parseArgInt('--limit', 0)
  const chunkSize = parseArgInt('--chunk-size', 2000)
  const batchSize = parseArgInt('--batch-size', 500)
  const concurrency = parseArgInt('--concurrency', 16)

  if (!(await columnExists())) {
    console.error('Missing products.source_album_date — run db/upgrade.sql first.')
    process.exit(1)
  }

  const totalPending = await countPending()
  const targetTotal = limit > 0 ? Math.min(limit, totalPending) : totalPending
  console.log(`Products missing source_album_date: ${totalPending}`)
  if (limit > 0) console.log(`Processing up to ${targetTotal} (--limit)`)

  const updates: { id: string; albumDate: string }[] = []
  const needsFetch: PendingProduct[] = []

  let processed = 0
  let offset = 0

  console.log('Phase 1: parse import_job_items.raw_json…')
  while (processed < targetTotal) {
    const take = Math.min(chunkSize, targetTotal - processed)
    const products = await loadProductChunk(offset, take)
    if (!products.length) break

    const jobMap = await loadLatestJobItems(products.map((p) => p.id))

    for (const product of products) {
      const job = jobMap.get(product.id)
      const albumDate = albumDateFromRawJson(job?.raw_json ?? null)
      if (albumDate) {
        updates.push({ id: product.id, albumDate })
      } else if (fetchRemote) {
        needsFetch.push({
          ...product,
          fetchUrl: resolveFetchUrl(product, job),
        })
      }
    }

    processed += products.length
    offset += products.length
    console.log(`  scanned ${processed} / ${targetTotal} (${updates.length} from raw_json)`)
  }

  if (fetchRemote && needsFetch.length) {
    const urlToProductIds = new Map<string, string[]>()
    let noUrl = 0
    for (const product of needsFetch) {
      const url = product.fetchUrl
      if (!url) {
        noUrl++
        continue
      }
      const ids = urlToProductIds.get(url) ?? []
      ids.push(product.id)
      urlToProductIds.set(url, ids)
    }

    const uniqueUrls = Array.from(urlToProductIds.keys())
    console.log(
      `Phase 2: fetch ${uniqueUrls.length} unique Yupoo URLs (${needsFetch.length} products, concurrency ${concurrency})…`
    )
    if (noUrl) console.log(`  ${noUrl} products have no album URL — skipped`)

    const started = Date.now()
    const urlDates = await fetchDatesForUrls(uniqueUrls, concurrency, (done, total, failures) => {
      const elapsed = (Date.now() - started) / 1000
      const rate = done / Math.max(elapsed, 0.001)
      const eta = rate > 0 ? Math.round((total - done) / rate) : 0
      console.log(`  fetched ${done}/${total} (${failures} failed, ~${eta}s remaining)`)
    })

    for (const [url, albumDate] of Array.from(urlDates.entries())) {
      if (!albumDate) continue
      for (const id of urlToProductIds.get(url) ?? []) {
        updates.push({ id, albumDate })
      }
    }
  }

  const uniqueUpdates = new Map<string, string>()
  for (const row of updates) {
    uniqueUpdates.set(row.id, row.albumDate)
  }
  const finalUpdates = Array.from(uniqueUpdates.entries()).map(([id, albumDate]) => ({
    id,
    albumDate,
  }))

  console.log(`Applying ${finalUpdates.length} date updates…`)
  if (dryRun) {
    for (let i = 0; i < Math.min(10, finalUpdates.length); i++) {
      const u = finalUpdates[i]!
      console.log(`  [dry-run] ${u.id} → ${u.albumDate}`)
    }
    if (finalUpdates.length > 10) {
      console.log(`  … and ${finalUpdates.length - 10} more`)
    }
  } else {
    await bulkApplyDates(finalUpdates, batchSize, false)
  }

  const skipped = targetTotal - finalUpdates.length
  console.log(
    `Done. ${finalUpdates.length} ${dryRun ? 'would be updated' : 'updated'}, ${skipped} still without date.`
  )
  if (skipped > 0 && !fetchRemote) {
    console.log('Re-run with --fetch to load dates from Yupoo for the rest.')
  }

  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
