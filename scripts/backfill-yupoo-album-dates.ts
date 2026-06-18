#!/usr/bin/env npx tsx
/**
 * Backfill products.source_album_date from Yupoo album datePublished.
 *
 * Resumable + incremental DB writes (safe for 47k+ products):
 * - Cursor-based scan (no OFFSET skip after partial updates)
 * - Checkpoint file per fetched URL (.cache/yupoo-backfill/url-dates.jsonl)
 * - Applies dates to DB during the run (not only at the end)
 * - Yupoo passwords from import_sources (password-protected stores)
 * - Retries + lower default concurrency to reduce rate-limit failures
 *
 *   npm run db:backfill-yupoo-dates -- --fetch
 *   npm run db:backfill-yupoo-dates -- --fetch --resume
 *   npm run db:backfill-yupoo-dates -- --fetch --retry-failed
 *   npm run db:backfill-yupoo-dates -- --apply-checkpoint
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { resolve, join } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { normalizeYupooAlbumDate, parseYupooAlbumDateFromHtml } from '@/lib/yupoo/parse-album-date'
import { fetchHtml, sleep } from '@/lib/yupoo/client'
import {
  createYupooFetchContext,
  isYupooPasswordGateHtml,
  type YupooFetchContext,
  yupooOrigin,
} from '@/lib/yupoo/session'

const CHECKPOINT_DIR = resolve(process.cwd(), '.cache/yupoo-backfill')
const URL_DATES_FILE = join(CHECKPOINT_DIR, 'url-dates.jsonl')
const MANIFEST_FILE = join(CHECKPOINT_DIR, 'manifest.json')

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

type UrlDateRecord = {
  url: string
  date: string | null
  error?: string
  at: string
}

type Manifest = {
  urlToProductIds: Record<string, string[]>
  builtAt: string
}

function parseArgInt(name: string, fallback: number): number {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`))
  if (!arg) return fallback
  const n = Number(arg.slice(name.length + 1))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
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

function ensureCheckpointDir() {
  if (!existsSync(CHECKPOINT_DIR)) {
    mkdirSync(CHECKPOINT_DIR, { recursive: true })
  }
}

function loadUrlDateCheckpoint(): Map<string, UrlDateRecord> {
  const map = new Map<string, UrlDateRecord>()
  if (!existsSync(URL_DATES_FILE)) return map
  for (const line of readFileSync(URL_DATES_FILE, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t) continue
    try {
      const rec = JSON.parse(t) as UrlDateRecord
      if (rec.url) map.set(rec.url, rec)
    } catch {
      // skip bad line
    }
  }
  return map
}

function appendUrlDateRecord(rec: UrlDateRecord) {
  ensureCheckpointDir()
  appendFileSync(URL_DATES_FILE, `${JSON.stringify(rec)}\n`, 'utf8')
}

function saveManifest(manifest: Manifest) {
  ensureCheckpointDir()
  writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2), 'utf8')
}

function loadManifest(): Manifest | null {
  if (!existsSync(MANIFEST_FILE)) return null
  try {
    return JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')) as Manifest
  } catch {
    return null
  }
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

async function loadProductChunk(afterId: string, chunkSize: number): Promise<ProductRow[]> {
  return queryDb<ProductRow[]>(
    `SELECT id, source_url, source_album_id
     FROM products
     WHERE source_album_id IS NOT NULL
       AND TRIM(source_album_id) != ''
       AND source_album_date IS NULL
       AND id > ?
     ORDER BY id ASC
     LIMIT ?`,
    [afterId, chunkSize]
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

  await resetDbPool()

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

function productUpdatesForUrl(
  url: string,
  date: string,
  urlToProductIds: Record<string, string[]>
): { id: string; albumDate: string }[] {
  return (urlToProductIds[url] ?? []).map((id) => ({ id, albumDate: date }))
}

async function loadYupooFetchContexts(): Promise<Map<string, YupooFetchContext>> {
  const contexts = new Map<string, YupooFetchContext>()
  const rows = await queryDb<{ yupoo_category_url: string | null; yupoo_access_password: string | null }[]>(
    `SELECT yupoo_category_url, yupoo_access_password
     FROM import_sources
     WHERE LOWER(source_type) = 'yupoo'
       AND yupoo_category_url IS NOT NULL
       AND yupoo_access_password IS NOT NULL
       AND TRIM(yupoo_access_password) != ''`
  )

  for (const row of rows) {
    const seed = String(row.yupoo_category_url ?? '').trim()
    const password = String(row.yupoo_access_password ?? '').trim()
    if (!seed || !password) continue
    try {
      const origin = yupooOrigin(seed)
      if (contexts.has(origin)) continue
      const ctx = await createYupooFetchContext(seed, password)
      contexts.set(origin, ctx)
      console.log(`  Yupoo auth: ${origin}`)
    } catch (err) {
      console.warn(`  Yupoo auth failed for ${seed}:`, err instanceof Error ? err.message : err)
    }
  }

  const envPwd = process.env.YUPOO_ACCESS_PASSWORD?.trim()
  const envSeed = process.env.YUPOO_STORE_URL?.trim()
  if (envPwd && envSeed && !contexts.has(yupooOrigin(envSeed))) {
    try {
      const ctx = await createYupooFetchContext(envSeed, envPwd)
      contexts.set(yupooOrigin(envSeed), ctx)
      console.log(`  Yupoo auth (env): ${yupooOrigin(envSeed)}`)
    } catch (err) {
      console.warn('  Yupoo env auth failed:', err instanceof Error ? err.message : err)
    }
  }

  return contexts
}

async function fetchHtmlForUrl(
  url: string,
  contexts: Map<string, YupooFetchContext>
): Promise<string> {
  let origin: string
  try {
    origin = yupooOrigin(url)
  } catch {
    return fetchHtml(url)
  }
  const ctx = contexts.get(origin)
  if (ctx) return ctx.fetchHtml(url)
  return fetchHtml(url)
}

async function fetchAlbumDateWithRetry(
  url: string,
  contexts: Map<string, YupooFetchContext>,
  maxAttempts: number
): Promise<{ date: string | null; error?: string }> {
  let lastError = ''

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const html = await fetchHtmlForUrl(url, contexts)
      if (isYupooPasswordGateHtml(html)) {
        return { date: null, error: 'password_gate' }
      }
      const date = parseYupooAlbumDateFromHtml(html)
      if (date) return { date }
      return { date: null, error: 'no_datePublished' }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
      if (attempt < maxAttempts) {
        await sleep(500 * 2 ** (attempt - 1))
      }
    }
  }

  return { date: null, error: lastError || 'fetch_failed' }
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  if (!items.length) return
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      await worker(items[index]!)
    }
  })
  await Promise.all(runners)
}

async function applyCheckpointOnly(
  dryRun: boolean,
  batchSize: number
): Promise<void> {
  const manifest = loadManifest()
  if (!manifest) {
    console.error('No manifest at', MANIFEST_FILE, '— run a full --fetch first.')
    process.exit(1)
  }

  const checkpoint = loadUrlDateCheckpoint()
  const updates: { id: string; albumDate: string }[] = []

  for (const [url, rec] of Array.from(checkpoint.entries())) {
    if (!rec.date) continue
    updates.push(...productUpdatesForUrl(url, rec.date, manifest.urlToProductIds))
  }

  const unique = new Map<string, string>()
  for (const u of updates) unique.set(u.id, u.albumDate)
  const finalUpdates = Array.from(unique.entries()).map(([id, albumDate]) => ({
    id,
    albumDate,
  }))

  console.log(`Applying ${finalUpdates.length} updates from checkpoint…`)
  if (!dryRun) {
    await bulkApplyDates(finalUpdates, batchSize, false)
  }
  console.log('Done.')
}

async function main() {
  loadDotEnv()
  const dryRun = hasFlag('--dry-run')
  const fetchRemote = hasFlag('--fetch')
  const applyCheckpointOnlyMode = hasFlag('--apply-checkpoint')
  const fresh = hasFlag('--fresh')
  const retryFailed = hasFlag('--retry-failed')
  const resume = hasFlag('--resume') || (!fresh && existsSync(URL_DATES_FILE))
  const limit = parseArgInt('--limit', 0)
  const chunkSize = parseArgInt('--chunk-size', 2000)
  const batchSize = parseArgInt('--batch-size', 500)
  const concurrency = parseArgInt('--concurrency', 6)
  const maxAttempts = parseArgInt('--retries', 3)
  const flushEvery = parseArgInt('--flush-every', 50)

  if (!(await columnExists())) {
    console.error('Missing products.source_album_date — run db/upgrade.sql first.')
    process.exit(1)
  }

  if (applyCheckpointOnlyMode) {
    await applyCheckpointOnly(dryRun, batchSize)
    await resetDbPool()
    return
  }

  if (fresh) {
    console.log('--fresh: ignoring existing checkpoint/manifest')
  }

  const totalPending = await countPending()
  console.log(`Products missing source_album_date: ${totalPending}`)
  if (resume && existsSync(URL_DATES_FILE)) {
    console.log(`Resume: loaded checkpoint (${loadUrlDateCheckpoint().size} URLs)`)
  }

  const urlToProductIds: Record<string, string[]> = {}
  let rawJsonApplied = 0
  let lastId = ''
  let scanned = 0

  const skipPhase1 = resume && existsSync(MANIFEST_FILE) && fetchRemote && !hasFlag('--rescan')

  if (skipPhase1) {
    const manifest = loadManifest()!
    Object.assign(urlToProductIds, manifest.urlToProductIds)
    console.log(
      `Skipping scan — using manifest (${Object.keys(urlToProductIds).length} URLs, built ${manifest.builtAt})`
    )
  } else {
    console.log('Phase 1: scan products + parse raw_json (cursor pagination)…')
    while (true) {
      if (limit > 0 && scanned >= limit) break

      const take = limit > 0 ? Math.min(chunkSize, limit - scanned) : chunkSize
      const products = await loadProductChunk(lastId, take)
      if (!products.length) break

      const jobMap = await loadLatestJobItems(products.map((p) => p.id))
      const chunkUpdates: { id: string; albumDate: string }[] = []

      for (const product of products) {
        const job = jobMap.get(product.id)
        const albumDate = albumDateFromRawJson(job?.raw_json ?? null)
        if (albumDate) {
          chunkUpdates.push({ id: product.id, albumDate })
        } else if (fetchRemote) {
          const url = resolveFetchUrl(product, job)
          if (url) {
            const ids = urlToProductIds[url] ?? []
            ids.push(product.id)
            urlToProductIds[url] = ids
          }
        }
      }

      if (chunkUpdates.length && !dryRun) {
        await bulkApplyDates(chunkUpdates, batchSize, false)
        rawJsonApplied += chunkUpdates.length
      } else {
        rawJsonApplied += chunkUpdates.length
      }

      scanned += products.length
      lastId = products[products.length - 1]!.id
      console.log(`  scanned ${scanned} (${rawJsonApplied} from raw_json applied)`)
    }

    if (fetchRemote && Object.keys(urlToProductIds).length) {
      saveManifest({
        urlToProductIds,
        builtAt: new Date().toISOString(),
      })
      console.log(`Saved manifest: ${Object.keys(urlToProductIds).length} URLs → ${MANIFEST_FILE}`)
    }
  }

  if (!fetchRemote) {
    console.log(`Done. ${rawJsonApplied} from raw_json. Re-run with --fetch for Yupoo HTML.`)
    await resetDbPool()
    return
  }

  const manifest = loadManifest()
  if (!manifest) {
    console.error('No URLs to fetch — nothing pending or manifest missing.')
    await resetDbPool()
    return
  }

  const map = manifest.urlToProductIds
  const checkpoint = fresh ? new Map<string, UrlDateRecord>() : loadUrlDateCheckpoint()
  const allUrls = Object.keys(map)

  const urlsToFetch = allUrls.filter((url) => {
    const prev = checkpoint.get(url)
    if (!prev) return true
    if (retryFailed) return !prev.date
    if (resume && prev.date) return false
    return !prev.date
  })

  console.log(
    `Phase 2: fetch ${urlsToFetch.length} URLs (${allUrls.length} total, concurrency ${concurrency}, retries ${maxAttempts})…`
  )

  const contexts = await loadYupooFetchContexts()
  if (!contexts.size) {
    console.log('  No Yupoo passwords in import_sources — using anonymous fetch (may fail on locked stores)')
  }

  let done = 0
  let httpFailures = 0
  let datesFound = 0
  let dbApplied = 0
  const pendingDb: { id: string; albumDate: string }[] = []
  const started = Date.now()

  async function flushDb() {
    if (!pendingDb.length || dryRun) {
      pendingDb.length = 0
      return
    }
    const batch = pendingDb.splice(0, pendingDb.length)
    const unique = new Map<string, string>()
    for (const u of batch) unique.set(u.id, u.albumDate)
    const updates = Array.from(unique.entries()).map(([id, albumDate]) => ({ id, albumDate }))
    await bulkApplyDates(updates, batchSize, false)
    dbApplied += updates.length
  }

  await runPool(urlsToFetch, concurrency, async (url) => {
    const result = await fetchAlbumDateWithRetry(url, contexts, maxAttempts)
    const rec: UrlDateRecord = {
      url,
      date: result.date,
      error: result.error,
      at: new Date().toISOString(),
    }
    appendUrlDateRecord(rec)
    checkpoint.set(url, rec)

    if (result.date) {
      datesFound++
      pendingDb.push(...productUpdatesForUrl(url, result.date, map))
    } else if (result.error && result.error !== 'no_datePublished') {
      httpFailures++
    }

    done++
    if (done % flushEvery === 0 || done === urlsToFetch.length) {
      await flushDb()
    }

    if (done % 100 === 0 || done === urlsToFetch.length) {
      const elapsed = (Date.now() - started) / 1000
      const rate = done / Math.max(elapsed, 0.001)
      const eta = rate > 0 ? Math.round((urlsToFetch.length - done) / rate) : 0
      console.log(
        `  ${done}/${urlsToFetch.length} fetched · ${datesFound} dates · ${httpFailures} errors · ${dbApplied} saved · ~${eta}s left`
      )
    }
  })

  await flushDb()

  const stillPending = await countPending()
  console.log(
    `Done. ${rawJsonApplied} from raw_json, ${dbApplied} from fetch applied this run, ${stillPending} products still missing date.`
  )
  if (stillPending > 0) {
    console.log('Re-run: npm run db:backfill-yupoo-dates -- --fetch --resume --retry-failed')
    console.log('If DB dropped at end: npm run db:backfill-yupoo-dates -- --apply-checkpoint')
  }

  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
