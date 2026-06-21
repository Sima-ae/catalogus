#!/usr/bin/env npx tsx
/**
 * Fix WeCatalog product titles after a --fast import (translation skipped).
 * Updates name, description, and short_description only — no images or prices.
 *
 *   npm run db:fix-wecatalog-titles
 *   npm run db:fix-wecatalog-titles -- --dry-run
 *   npm run db:fix-wecatalog-titles -- --limit=100
 *   npm run db:fix-wecatalog-titles -- --concurrency=4
 *   npm run db:fix-wecatalog-titles -- --no-fetch   # use import_job_items.raw_json only
 *   npm run db:fix-wecatalog-titles -- --verbose    # log each skip reason
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { runPool } from '@/lib/async-pool'
import { queryDb } from '@/lib/db'
import { getAllBrandNames } from '@/lib/brand-sku-prefixes'
import {
  buildProductInputFromWecatalogImport,
  getImportSource,
  resolveWecatalogListUrl,
} from '@/lib/import-db'
import { createWecatalogSession, type WecatalogSession } from '@/lib/wecatalog/client'
import { fetchWecatalogProduct } from '@/lib/wecatalog/fetch-product'
import {
  parseWecatalogExternalId,
  type WecatalogProductData,
} from '@/lib/wecatalog/types'
import {
  catalogCardDescription,
  cleanImportDescription,
  isPlaceholderProductTitle,
  isSkuOnlyTitle,
  sanitizeProductName,
} from '@/lib/yupoo/import-text'
import {
  finalizeYupooProductTitle,
  resetCjkTranslateDelayMs,
  setCjkTranslateDelayMs,
  titleNeedsEnglishCleanup,
} from '@/lib/yupoo/product-title'
import { fixBrandNamesInText } from '@/lib/product-brand-text'

const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff\u31f0-\u31ff]/

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

function parseArgInt(name: string, fallback: number): number {
  const prefix = `--${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

type ProductRow = {
  id: string
  name: string
  sku: string | null
  description: string | null
  short_description: string | null
  brand: string | null
  category: string
  category_id: string | null
  source_album_id: string | null
  source_url: string | null
}

type JobItemRow = {
  album_id: string
  album_url: string
  album_title: string | null
  raw_json: string | null
  product_id: string | null
  source_id: string
}

function wecatalogFromRawJson(raw: string | null): WecatalogProductData | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as { wecatalog?: WecatalogProductData }
    const wecatalog = data.wecatalog
    if (!wecatalog || !String(wecatalog.name ?? '').trim()) return null
    return wecatalog
  } catch {
    return null
  }
}

function needsTitleFix(name: string, goodsId: string | null): boolean {
  const t = String(name ?? '').trim()
  if (!t) return true
  if (isPlaceholderProductTitle(t)) return true
  if (titleNeedsEnglishCleanup(t)) return true
  if (isSkuOnlyTitle(t)) return true
  if (/^product$/i.test(t)) return true
  if (goodsId && (t === goodsId || t === `wecatalog-${goodsId}`)) return true
  return false
}

type SkipReason = 'no_source' | 'empty_result' | 'placeholder' | 'still_cjk' | 'unchanged'

function classifyTitleCandidate(next: string, current: string): SkipReason | 'accepted' {
  const trimmed = String(next ?? '').trim()
  if (!trimmed) return 'empty_result'
  if (isPlaceholderProductTitle(trimmed)) return 'placeholder'
  if (titleNeedsEnglishCleanup(trimmed)) return 'still_cjk'
  if (trimmed === current) return 'unchanged'
  return 'accepted'
}

function isImprovableTitle(next: string, current: string): boolean {
  return classifyTitleCandidate(next, current) === 'accepted'
}

async function translateRawTitleCandidate(
  raw: string,
  brandName: string | null,
  brandNames: string[]
): Promise<string> {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed || (!CJK_RE.test(trimmed) && isSkuOnlyTitle(trimmed))) return ''

  let name = await finalizeYupooProductTitle(trimmed)
  name = fixBrandNamesInText(sanitizeProductName(name), brandNames, brandName)
  return name.trim()
}

async function resolveWecatalogData(
  row: ProductRow,
  job: JobItemRow | undefined,
  allowFetch: boolean,
  sessionCache: Map<string, WecatalogSession>,
  brandNames: string[]
): Promise<WecatalogProductData | null> {
  const fromRaw = wecatalogFromRawJson(job?.raw_json ?? null)
  if (fromRaw) return fromRaw

  if (!allowFetch) return null

  const goodsId = parseWecatalogExternalId(String(row.source_album_id ?? ''))
  const sourceId = job?.source_id
  if (!goodsId || !sourceId) return null

  const source = await getImportSource(sourceId)
  if (!source) return null

  const listUrl = resolveWecatalogListUrl(source)
  let session = sessionCache.get(listUrl)
  if (!session) {
    session = createWecatalogSession(listUrl)
    sessionCache.set(listUrl, session)
  }

  const shopId = session.getContext().shopId
  return fetchWecatalogProduct(session, shopId, goodsId, brandNames)
}

async function buildTranslatedFields(
  wecatalog: WecatalogProductData,
  row: ProductRow,
  current: string,
  brandNames: string[]
): Promise<{ name: string; description: string; short_description: string | null }> {
  const brandName = row.brand?.trim() || null
  const catalog = {
    categoryName: String(row.category ?? '').trim() || 'Uncategorized',
    categoryId: row.category_id?.trim() || null,
    brandName,
  }

  const input = await buildProductInputFromWecatalogImport(wecatalog, catalog, {
    translateTitle: true,
  })

  let name = input.name
  if (!isImprovableTitle(name, current)) {
    const rawCandidates = [
      wecatalog.name,
      String(wecatalog.description ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line && CJK_RE.test(line)),
    ].filter((value): value is string => Boolean(value?.trim()))

    for (const raw of rawCandidates) {
      const forced = await translateRawTitleCandidate(raw, brandName, brandNames)
      if (isImprovableTitle(forced, current)) {
        name = forced
        break
      }
    }
  }

  const description = fixBrandNamesInText(
    cleanImportDescription(wecatalog.description || wecatalog.name, name, brandName),
    brandNames,
    brandName
  )
  const short_description =
    catalogCardDescription(name, description, row.short_description, brandName).slice(0, 280) ||
    null

  return { name, description, short_description }
}

async function main() {
  loadDotEnv()

  const dryRun = process.argv.includes('--dry-run')
  const allowFetch = !process.argv.includes('--no-fetch')
  const fixAll = process.argv.includes('--all')
  const verbose = process.argv.includes('--verbose')
  const limit = parseArgInt('limit', 0)
  const concurrency = parseArgInt('concurrency', 3)

  if (concurrency > 1) {
    setCjkTranslateDelayMs(100)
  }

  const products = await queryDb<ProductRow[]>(
    `SELECT id, name, sku, description, short_description, brand, category, category_id,
            source_album_id, source_url
     FROM products
     WHERE source_album_id LIKE 'wecatalog-%'
     ORDER BY created_at ASC`
  )

  const jobItems = await queryDb<JobItemRow[]>(
    `SELECT ji.album_id, ji.album_url, ji.album_title, ji.raw_json, ji.product_id, j.source_id
     FROM import_job_items ji
     INNER JOIN import_jobs j ON j.id = ji.job_id
     WHERE ji.album_id LIKE 'wecatalog-%' OR ji.product_id IS NOT NULL`
  ).catch(() => [] as JobItemRow[])

  const byAlbum = new Map<string, JobItemRow>()
  const byProduct = new Map<string, JobItemRow>()
  for (const item of jobItems) {
    if (item.raw_json || !byAlbum.has(item.album_id)) {
      byAlbum.set(item.album_id, item)
    }
    if (item.product_id && (item.raw_json || !byProduct.has(item.product_id))) {
      byProduct.set(item.product_id, item)
    }
  }

  const brandNames = await getAllBrandNames()
  const sessionCache = new Map<string, WecatalogSession>()

  const candidates = products.filter((row) => {
    const goodsId = parseWecatalogExternalId(String(row.source_album_id ?? ''))
    return fixAll || needsTitleFix(row.name, goodsId)
  })

  const work = limit > 0 ? candidates.slice(0, limit) : candidates

  let scanned = 0
  let updated = 0
  let skipped = 0
  let fetched = 0
  let failed = 0
  const skipReasons: Record<SkipReason, number> = {
    no_source: 0,
    empty_result: 0,
    placeholder: 0,
    still_cjk: 0,
    unchanged: 0,
  }

  console.log(
    `WeCatalog title fix: ${work.length} of ${products.length} products` +
      `${fixAll ? ' (--all)' : ''}, concurrency=${concurrency}, fetch=${allowFetch}` +
      `${dryRun ? ', dry-run' : ''}`
  )

  await runPool(work, concurrency, async (row) => {
    scanned++
    const current = String(row.name ?? '').trim()
    const albumId = String(row.source_album_id ?? '').trim()
    const job = byProduct.get(row.id) ?? (albumId ? byAlbum.get(albumId) : undefined)

    try {
      const hadRaw = Boolean(wecatalogFromRawJson(job?.raw_json ?? null))
      const wecatalog = await resolveWecatalogData(
        row,
        job,
        allowFetch,
        sessionCache,
        brandNames
      )

      if (!wecatalog) {
        skipped++
        skipReasons.no_source++
        if (verbose) {
          console.warn(`SKIP ${row.id}: no WeCatalog source data (album=${albumId || '?'})`)
        }
        return
      }

      if (!hadRaw && allowFetch) fetched++

      const next = await buildTranslatedFields(wecatalog, row, current, brandNames)
      const reason = classifyTitleCandidate(next.name, current)
      if (reason !== 'accepted') {
        skipped++
        skipReasons[reason]++
        if (verbose) {
          console.warn(
            `SKIP ${row.id} [${reason}]: "${current.slice(0, 60)}" → "${String(next.name ?? '').slice(0, 60)}"`
          )
        }
        return
      }

      updated++
      if (dryRun) {
        console.log(`[dry-run] ${row.id}: "${current.slice(0, 70)}" → "${next.name}"`)
        return
      }

      await queryDb(
        `UPDATE products SET name = ?, description = ?, short_description = ? WHERE id = ?`,
        [next.name, next.description, next.short_description, row.id]
      )
      console.log(`updated ${row.id} → ${next.name}`)
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : String(err)
      console.error(`FAIL ${row.id} (${albumId}): ${message}`)
    }
  })

  resetCjkTranslateDelayMs()

  console.log(
    `Done. scanned=${scanned} updated=${updated} fetched=${fetched} skipped=${skipped} failed=${failed}` +
      `${dryRun ? ' (dry-run)' : ''}`
  )
  console.log(
    `Skip reasons: no_source=${skipReasons.no_source} unchanged=${skipReasons.unchanged} still_cjk=${skipReasons.still_cjk} empty_result=${skipReasons.empty_result} placeholder=${skipReasons.placeholder}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
