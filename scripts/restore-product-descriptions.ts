#!/usr/bin/env npx tsx
/**
 * Restore product descriptions from import_job_items raw_json, then remove only
 * Chinese / supplier shop boilerplate (keeps English product copy).
 *
 *   npm run db:restore-descriptions
 *   npm run db:restore-descriptions -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import {
  catalogCardDescription,
  cleanImportDescription,
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

type JobItemRow = {
  album_id: string
  raw_json: string | null
}

type ProductRow = {
  id: string
  name: string
  description: string | null
  short_description: string | null
  brand: string | null
  source_album_id: string | null
}

function albumDescriptionFromRaw(raw: string | null): string {
  if (!raw) return ''
  try {
    const data = JSON.parse(raw) as {
      album?: { description?: string }
      translated?: {
        enDescription?: string
        rawDescription?: string
      }
    }
    return (
      String(data.translated?.enDescription ?? '').trim() ||
      String(data.album?.description ?? '').trim() ||
      String(data.translated?.rawDescription ?? '').trim() ||
      ''
    )
  } catch {
    return ''
  }
}

function buildDescription(row: ProductRow, rawDescription: string) {
  const name = String(row.name ?? '').trim()
  const brand = row.brand?.trim() || null
  const source = rawDescription.trim() || String(row.description ?? '').trim()
  const description = cleanImportDescription(source, name, brand)
  const shortFromDesc =
    catalogCardDescription(name, description, undefined, brand).slice(0, 280) || ''
  const short_description =
    catalogCardDescription(name, description, description, brand).slice(0, 280) ||
    shortFromDesc ||
    null
  return { description, short_description }
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')
  const restoreAll = process.argv.includes('--all')

  const [{ total }] = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM products`
  )
  const [{ emptyBefore }] = await queryDb<{ emptyBefore: number }[]>(
    `SELECT COUNT(*) AS emptyBefore FROM products WHERE TRIM(COALESCE(description, '')) = ''`
  )

  console.log(`Products: ${total}`)
  console.log(`Empty descriptions before restore: ${emptyBefore}`)

  const jobItems = await queryDb<JobItemRow[]>(
    `SELECT album_id, raw_json FROM import_job_items WHERE raw_json IS NOT NULL`
  )
  const rawByAlbum = new Map<string, string>()
  for (const item of jobItems) {
    if (item.album_id && item.raw_json) rawByAlbum.set(item.album_id, item.raw_json)
  }

  const products = await queryDb<ProductRow[]>(
    restoreAll
      ? `SELECT id, name, description, short_description, brand, source_album_id FROM products`
      : `SELECT id, name, description, short_description, brand, source_album_id FROM products
         WHERE TRIM(COALESCE(description, '')) = ''`
  )

  console.log(`Rows to process: ${products.length}`)

  let restored = 0
  let preview = 0

  for (const row of products) {
    const albumId = String(row.source_album_id ?? '').trim()
    const raw = albumId ? rawByAlbum.get(albumId) : undefined
    const rawDescription = albumDescriptionFromRaw(raw ?? null)
    if (!rawDescription) continue

    const { description, short_description } = buildDescription(row, rawDescription)
    if (!description.trim()) continue

    const current = String(row.description ?? '').trim()
    if (current === description.trim()) continue

    restored++
    if (preview < 5) {
      console.log(`\n- ${row.id} ${row.name}`)
      console.log(`  raw:    ${rawDescription.slice(0, 100)}`)
      console.log(`  saved:  ${description.slice(0, 100)}`)
      preview++
    }

    if (dryRun) continue

    await queryDb(`UPDATE products SET description = ?, short_description = ? WHERE id = ?`, [
      description,
      short_description,
      row.id,
    ])

    if (restored % 500 === 0) {
      console.log(`Restored ${restored}…`)
    }
  }

  const [{ emptyAfter }] = await queryDb<{ emptyAfter: number }[]>(
    `SELECT COUNT(*) AS emptyAfter FROM products WHERE TRIM(COALESCE(description, '')) = ''`
  )

  console.log(
    dryRun
      ? `\nDry run: ${restored} descriptions would be restored.`
      : `\nRestored ${restored} descriptions.`
  )
  console.log(`Empty descriptions after: ${emptyAfter}`)
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
