#!/usr/bin/env npx tsx
/**
 * Fix Yupoo product names (bad translations, "Imported product", shop taglines).
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
  isSkuOnlyTitle,
  isYupooShopTagline,
  resolveYupooProductTitle,
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
}

type JobItemRow = {
  album_id: string
  album_title: string | null
  raw_json: string | null
}

function albumFieldsFromRawJson(raw: string | null): {
  title: string | null
  rawTitle: string | null
  description: string | null
  enTitle: string | null
  enDescription: string | null
} {
  if (!raw) {
    return {
      title: null,
      rawTitle: null,
      description: null,
      enTitle: null,
      enDescription: null,
    }
  }
  try {
    const data = JSON.parse(raw) as {
      album?: { title?: string; description?: string }
      translated?: {
        rawTitle?: string
        enTitle?: string
        enDescription?: string
        rawDescription?: string
      }
    }
    const albumTitle = data.album?.title?.trim() || null
    const rawTitle = data.translated?.rawTitle?.trim() || albumTitle
    return {
      title: albumTitle,
      rawTitle,
      description: data.album?.description?.trim() || null,
      enTitle: data.translated?.enTitle?.trim() || null,
      enDescription: data.translated?.enDescription?.trim() || null,
    }
  } catch {
    return {
      title: null,
      rawTitle: null,
      description: null,
      enTitle: null,
      enDescription: null,
    }
  }
}

function needsTitleFix(name: string): boolean {
  const t = name.trim()
  if (!t || /^imported product$/i.test(t)) return true
  if (isYupooShopTagline(t)) return true
  if (isSkuOnlyTitle(t)) return false
  const sanitized = sanitizeYupooAlbumTitle(t)
  if (!sanitized || sanitized.toLowerCase() === t.toLowerCase()) {
    if (/supplier product catalog|factory direct|wholesale|free shipping/i.test(t)) return true
  }
  return false
}

function pickAlbumTitle(
  raw: ReturnType<typeof albumFieldsFromRawJson>,
  job: JobItemRow | undefined,
  row: ProductRow
): string {
  const candidates = [
    raw.rawTitle,
    raw.title,
    job?.album_title,
  ].filter((v): v is string => Boolean(v?.trim()))

  for (const candidate of candidates) {
    if (isYupooShopTagline(candidate)) continue
    const sanitized = sanitizeYupooAlbumTitle(candidate)
    if (sanitized && /[a-zA-Z]{2,}/.test(sanitized)) return candidate
  }

  for (const candidate of candidates) {
    if (!isYupooShopTagline(candidate)) return candidate
  }

  return sanitizeYupooAlbumTitle(String(row.description ?? '')) || row.name
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
    if (!needsTitleFix(current)) continue

    const albumId = String(row.source_album_id ?? '').trim()
    const job = albumId ? byAlbum.get(albumId) : undefined
    const raw = albumFieldsFromRawJson(job?.raw_json ?? null)

    const albumTitle = pickAlbumTitle(raw, job, row)
    const descriptionSource =
      raw.description || raw.enDescription || String(row.description ?? '')

    const resolved = resolveYupooProductTitle({
      albumTitle,
      description: descriptionSource,
      thumbTitle: job?.album_title,
    })

    if (
      !resolved ||
      resolved === current ||
      /^imported product$/i.test(resolved) ||
      isYupooShopTagline(resolved)
    ) {
      continue
    }

    const brand = row.brand?.trim() || null
    const cleanedDescription = cleanImportDescription(
      descriptionSource || String(row.description ?? ''),
      resolved,
      brand
    )
    const description =
      cleanedDescription ||
      String(row.description ?? '').trim() ||
      resolved
    const short_description =
      catalogCardDescription(resolved, description, row.short_description, brand).slice(0, 280) ||
      null

    updated++
    if (dryRun) {
      console.log(`[dry-run] ${row.id}: "${current.slice(0, 70)}" → "${resolved}"`)
      continue
    }

    await queryDb(
      `UPDATE products SET name = ?, description = ?, short_description = ? WHERE id = ?`,
      [resolved, description, short_description, row.id]
    )
    console.log(`updated ${row.id} → ${resolved}`)
  }

  console.log(`Done. scanned=${scanned} updated=${updated}${dryRun ? ' (dry-run)' : ''}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
