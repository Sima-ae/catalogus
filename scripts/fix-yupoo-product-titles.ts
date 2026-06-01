#!/usr/bin/env npx tsx
/**
 * Fix Yupoo product names — re-fetch album titles from Yupoo when needed.
 *
 *   npm run db:fix-yupoo-titles
 *   npm run db:fix-yupoo-titles -- --dry-run
 *   npm run db:fix-yupoo-titles -- --no-fetch   # DB/job data only (no Yupoo HTTP)
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
import { fetchHtml, sleep } from '@/lib/yupoo/client'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import { resolveYupooProductTitleAsync } from '@/lib/yupoo/product-title'
import {
  catalogCardDescription,
  cleanImportDescription,
  isPlaceholderProductTitle,
  isSkuOnlyTitle,
  isYupooShopTagline,
  sanitizeYupooAlbumTitle,
} from '@/lib/yupoo/import-text'

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
  name: string
  sku: string | null
  description: string | null
  short_description: string | null
  brand: string | null
  source_album_id: string | null
  source_url: string | null
}

type JobItemRow = {
  album_id: string
  album_url: string
  album_title: string | null
  raw_json: string | null
}

function albumFieldsFromRawJson(raw: string | null): {
  title: string | null
  rawTitle: string | null
  description: string | null
} {
  if (!raw) {
    return { title: null, rawTitle: null, description: null }
  }
  try {
    const data = JSON.parse(raw) as {
      album?: { title?: string; description?: string }
      translated?: { rawTitle?: string; rawDescription?: string }
    }
    const albumTitle = data.album?.title?.trim() || null
    const rawTitle = data.translated?.rawTitle?.trim() || albumTitle
    return {
      title: albumTitle,
      rawTitle,
      description: data.album?.description?.trim() || null,
    }
  } catch {
    return { title: null, rawTitle: null, description: null }
  }
}

function needsTitleFix(name: string): boolean {
  const t = name.trim()
  if (isPlaceholderProductTitle(t)) return true
  if (isYupooShopTagline(t)) return true
  if (isSkuOnlyTitle(t)) return false
  if (/supplier product catalog|factory direct|wholesale|free shipping/i.test(t)) return true
  return false
}

function pickLocalAlbumTitle(
  raw: ReturnType<typeof albumFieldsFromRawJson>,
  job: JobItemRow | undefined
): string {
  const candidates = [raw.rawTitle, raw.title, job?.album_title].filter((v): v is string =>
    Boolean(v?.trim())
  )

  for (const candidate of candidates) {
    if (isPlaceholderProductTitle(candidate) || isYupooShopTagline(candidate)) continue
    const sanitized = sanitizeYupooAlbumTitle(candidate)
    if (sanitized && !isPlaceholderProductTitle(sanitized)) return candidate
  }

  for (const candidate of candidates) {
    if (!isPlaceholderProductTitle(candidate) && !isYupooShopTagline(candidate)) return candidate
  }

  return ''
}

function albumUrlFor(row: ProductRow, job: JobItemRow | undefined): string | null {
  const sourceUrl = String(row.source_url ?? '').trim()
  if (/yupoo\.com\/albums\//i.test(sourceUrl)) return sourceUrl
  const jobUrl = String(job?.album_url ?? '').trim()
  if (/yupoo\.com\/albums\//i.test(jobUrl)) return jobUrl
  return null
}

async function resolveTitleForProduct(
  row: ProductRow,
  job: JobItemRow | undefined,
  allowFetch: boolean
): Promise<{ name: string; descriptionSource: string } | null> {
  const raw = albumFieldsFromRawJson(job?.raw_json ?? null)
  const localTitle = pickLocalAlbumTitle(raw, job)
  let descriptionSource = raw.description || String(row.description ?? '')

  let resolved = await resolveYupooProductTitleAsync({
    albumTitle: localTitle,
    description: descriptionSource,
    thumbTitle: job?.album_title,
    fallbackSku: row.sku,
    fallbackAlbumId: row.source_album_id,
  })

  const needsFetch =
    allowFetch &&
    (isPlaceholderProductTitle(resolved) || isPlaceholderProductTitle(row.name))

  if (needsFetch) {
    const albumUrl = albumUrlFor(row, job)
    const albumId = String(row.source_album_id ?? '').trim()
    if (albumUrl && albumId) {
      try {
        const html = await fetchHtml(albumUrl)
        const album = parseAlbumPage(html, albumUrl, albumId)
        descriptionSource = album.description || descriptionSource
        resolved = await resolveYupooProductTitleAsync({
          albumTitle: album.title,
          description: album.description,
          thumbTitle: job?.album_title,
          fallbackSku: row.sku,
          fallbackAlbumId: albumId,
        })
      } catch (err) {
        console.warn(
          `WARN: fetch failed for ${row.id} (${albumUrl}):`,
          err instanceof Error ? err.message : err
        )
      }
    }
  }

  if (
    !resolved ||
    isPlaceholderProductTitle(resolved) ||
    isYupooShopTagline(resolved) ||
    resolved === row.name.trim()
  ) {
    return null
  }

  return { name: resolved, descriptionSource }
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')
  const allowFetch = !process.argv.includes('--no-fetch')

  const products = await queryDb<ProductRow[]>(
    `SELECT id, name, sku, description, short_description, brand, source_album_id, source_url
     FROM products
     WHERE source_album_id IS NOT NULL`
  )

  const jobItems = await queryDb<JobItemRow[]>(
    `SELECT album_id, album_url, album_title, raw_json FROM import_job_items`
  ).catch(() => [] as JobItemRow[])

  const byAlbum = new Map<string, JobItemRow>()
  for (const item of jobItems) {
    if (!byAlbum.has(item.album_id)) byAlbum.set(item.album_id, item)
  }

  let updated = 0
  let scanned = 0
  let fetched = 0
  let skipped = 0

  for (const row of products) {
    scanned++
    const current = String(row.name ?? '').trim()
    if (!needsTitleFix(current)) continue

    const albumId = String(row.source_album_id ?? '').trim()
    const job = albumId ? byAlbum.get(albumId) : undefined

    const beforeFetch = allowFetch && isPlaceholderProductTitle(current)
    const result = await resolveTitleForProduct(row, job, allowFetch)
    if (beforeFetch && result && !isPlaceholderProductTitle(result.name)) fetched++

    if (!result) {
      skipped++
      continue
    }

    const brand = row.brand?.trim() || null
    const cleanedDescription = cleanImportDescription(
      result.descriptionSource || String(row.description ?? ''),
      result.name,
      brand
    )
    const description =
      cleanedDescription ||
      String(row.description ?? '').trim() ||
      result.name
    const short_description =
      catalogCardDescription(result.name, description, row.short_description, brand).slice(
        0,
        280
      ) || null

    updated++
    if (dryRun) {
      console.log(`[dry-run] ${row.id}: "${current.slice(0, 70)}" → "${result.name}"`)
    } else {
      await queryDb(
        `UPDATE products SET name = ?, description = ?, short_description = ? WHERE id = ?`,
        [result.name, description, short_description, row.id]
      )
      console.log(`updated ${row.id} → ${result.name}`)
    }

    if (allowFetch && albumUrlFor(row, job)) {
      await sleep(800)
    }
  }

  console.log(
    `Done. scanned=${scanned} updated=${updated} fetched=${fetched} skipped=${skipped}${dryRun ? ' (dry-run)' : ''}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
