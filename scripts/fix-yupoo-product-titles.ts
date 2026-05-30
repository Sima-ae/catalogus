#!/usr/bin/env npx tsx
/**
 * Restore Yupoo numeric style codes as product names (e.g. 1308230).
 *
 *   npm run db:fix-yupoo-titles
 *   npm run db:fix-yupoo-titles -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
import {
  catalogCardDescription,
  cleanImportDescription,
  extractYupooStyleCode,
  isSkuOnlyTitle,
  resolveYupooProductTitle,
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
}

type JobItemRow = {
  album_id: string
  album_title: string | null
  raw_json: string | null
}

function styleCodeFromSku(sku: string | null): string | null {
  if (!sku) return null
  const m = String(sku).trim().match(/^(\d{5,}[a-zA-Z]?)-/)
  return m?.[1] && isSkuOnlyTitle(m[1]) ? m[1] : null
}

function titleFromRawJson(raw: string | null): string | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as {
      album?: { title?: string }
      translated?: { rawTitle?: string; enTitle?: string }
    }
    const candidates = [
      data.album?.title,
      data.translated?.rawTitle,
      data.translated?.enTitle,
    ]
    for (const c of candidates) {
      const t = String(c ?? '').trim()
      if (isSkuOnlyTitle(t)) return t.replace(/\s+/g, '')
      const code = extractYupooStyleCode(t)
      if (code) return code
    }
  } catch {
    return null
  }
  return null
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const products = await queryDb<ProductRow[]>(
    `SELECT id, name, sku, description, short_description, brand, source_album_id
     FROM products
     WHERE source_album_id IS NOT NULL`
  )

  const jobItems = await queryDb<JobItemRow[]>(
    `SELECT album_id, album_title, raw_json FROM import_job_items`
  ).catch(() => [] as JobItemRow[])

  const byAlbum = new Map<string, JobItemRow>()
  for (const item of jobItems) {
    if (!byAlbum.has(item.album_id)) byAlbum.set(item.album_id, item)
  }

  let updated = 0
  let scanned = 0

  for (const row of products) {
    scanned++
    const current = String(row.name ?? '').trim()
    if (isSkuOnlyTitle(current)) continue

    const albumId = String(row.source_album_id ?? '').trim()
    const job = albumId ? byAlbum.get(albumId) : undefined

    const resolved = resolveYupooProductTitle({
      albumTitle: current,
      description: String(row.description ?? ''),
      thumbTitle:
        job?.album_title ||
        titleFromRawJson(job?.raw_json ?? null) ||
        styleCodeFromSku(row.sku),
    })

    if (!isSkuOnlyTitle(resolved) || resolved === current) continue

    const brand = row.brand?.trim() || null
    const description = cleanImportDescription(String(row.description ?? ''), resolved, brand)
    const short_description =
      catalogCardDescription(resolved, description, row.short_description, brand).slice(0, 280) ||
      null

    updated++
    if (dryRun) {
      console.log(`[dry-run] ${row.id}: "${current.slice(0, 60)}…" → "${resolved}"`)
      continue
    }

    await queryDb(
      `UPDATE products SET name = ?, description = ?, short_description = ? WHERE id = ?`,
      [resolved, description || null, short_description, row.id]
    )
    console.log(`updated ${row.id} → ${resolved}`)
  }

  console.log(`Done. scanned=${scanned} updated=${updated}${dryRun ? ' (dry-run)' : ''}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
