#!/usr/bin/env npx tsx
/**
 * Backfill products.source_album_date from Yupoo album datePublished.
 *
 *   npm run db:backfill-yupoo-dates
 *   npm run db:backfill-yupoo-dates -- --dry-run
 *   npm run db:backfill-yupoo-dates -- --fetch   # re-fetch album HTML when raw_json has no date
 *   npm run db:backfill-yupoo-dates -- --limit=500
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { updateProduct } from '@/lib/products-db'
import { normalizeYupooAlbumDate, parseYupooAlbumDateFromHtml } from '@/lib/yupoo/parse-album-date'
import { fetchHtml, sleep } from '@/lib/yupoo/client'

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
  album_url: string | null
  raw_json: string | null
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

async function columnExists(): Promise<boolean> {
  const rows = await queryDb<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'products'
       AND COLUMN_NAME = 'source_album_date'`
  )
  return Number(rows[0]?.n ?? 0) > 0
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')
  const fetchRemote = process.argv.includes('--fetch')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Math.max(1, Number(limitArg.split('=')[1]) || 0) : 0

  if (!(await columnExists())) {
    console.error('Missing products.source_album_date — run db/upgrade.sql first.')
    process.exit(1)
  }

  const limitSql = limit > 0 ? ` LIMIT ${limit}` : ''
  const products = await queryDb<ProductRow[]>(
    `SELECT id, source_url, source_album_id
     FROM products
     WHERE source_album_id IS NOT NULL
       AND TRIM(source_album_id) != ''
       AND source_album_date IS NULL
     ORDER BY created_at ASC${limitSql}`
  )

  console.log(`Found ${products.length} products without source_album_date`)
  let updated = 0
  let skipped = 0

  for (const product of products) {
    const jobRows = await queryDb<JobItemRow[]>(
      `SELECT album_url, raw_json
       FROM import_job_items
       WHERE product_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [product.id]
    )
    const job = jobRows[0]
    let albumDate = albumDateFromRawJson(job?.raw_json ?? null)

    if (!albumDate && fetchRemote) {
      const url = job?.album_url?.trim() || product.source_url?.trim()
      if (url) {
        try {
          const html = await fetchHtml(url)
          albumDate = parseYupooAlbumDateFromHtml(html)
          await sleep(800)
        } catch (err) {
          console.warn(`  FETCH FAIL ${product.id}:`, err instanceof Error ? err.message : err)
        }
      }
    }

    if (!albumDate) {
      skipped++
      continue
    }

    console.log(`${dryRun ? '[dry-run] ' : ''}${product.id} → ${albumDate}`)
    if (!dryRun) {
      await updateProduct(product.id, { source_album_date: albumDate })
    }
    updated++
  }

  console.log(`Done. ${updated} updated, ${skipped} skipped (no date found).`)
  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
