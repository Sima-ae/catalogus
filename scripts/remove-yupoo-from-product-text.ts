#!/usr/bin/env npx tsx
/**
 * Remove Yupoo / 又拍 from product titles and descriptions already in the database.
 *
 *   npm run db:remove-yupoo-text
 *   npm run db:remove-yupoo-text -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import {
  catalogCardDescription,
  cleanImportDescription,
  containsYupooPlatformText,
  sanitizeProductName,
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
  description: string | null
  short_description: string | null
  brand: string | null
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const rows = await queryDb<ProductRow[]>(
    `SELECT id, name, description, short_description, brand
     FROM products
     WHERE LOWER(name) LIKE '%yupoo%'
        OR LOWER(COALESCE(description, '')) LIKE '%yupoo%'
        OR LOWER(COALESCE(short_description, '')) LIKE '%yupoo%'
        OR name LIKE '%又拍%'
        OR COALESCE(description, '') LIKE '%又拍%'
        OR COALESCE(short_description, '') LIKE '%又拍%'`
  )

  let updated = 0
  let skipped = 0
  const verbose = process.argv.includes('--verbose')

  for (const row of rows) {
    const rawName = String(row.name ?? '').trim()
    const brand = row.brand?.trim() || null
    const rawDescription = String(row.description ?? '').trim()
    const rawShort = String(row.short_description ?? '').trim()

    const name = sanitizeProductName(rawName)
    const description = cleanImportDescription(rawDescription, name, brand)
    const shortFromDesc =
      catalogCardDescription(name, description, undefined, brand).slice(0, 280) || ''
    const short_description = rawShort
      ? cleanImportDescription(rawShort, name, brand).slice(0, 280) || shortFromDesc || null
      : shortFromDesc || null

    const nameChanged = name !== rawName
    const descChanged = description !== rawDescription
    const shortChanged = (short_description ?? '') !== rawShort

    if (!nameChanged && !descChanged && !shortChanged) {
      skipped++
      if (verbose) {
        console.warn(
          `[skip] ${row.id} — SQL matched yupoo/又拍 but cleanup left text unchanged`
        )
        if (containsYupooPlatformText(rawName)) console.warn(`  name: ${rawName.slice(0, 120)}`)
        if (containsYupooPlatformText(rawDescription)) {
          console.warn(`  desc: ${rawDescription.slice(0, 120)}`)
        }
        if (containsYupooPlatformText(rawShort)) {
          console.warn(`  short: ${rawShort.slice(0, 120)}`)
        }
      }
      continue
    }
    if (
      containsYupooPlatformText(name) ||
      containsYupooPlatformText(description) ||
      containsYupooPlatformText(short_description)
    ) {
      console.warn(`[warn] ${row.id} still contains Yupoo after cleanup — manual review needed`)
    }

    updated++
    if (dryRun) {
      console.log(`[dry-run] ${row.id}`)
      if (nameChanged) console.log(`  name: ${rawName} → ${name}`)
      if (descChanged) {
        console.log(`  desc before: ${rawDescription.slice(0, 100)}`)
        console.log(`  desc after:  ${description.slice(0, 100)}`)
      }
      continue
    }

    await queryDb(
      `UPDATE products SET name = ?, description = ?, short_description = ? WHERE id = ?`,
      [name, description, short_description, row.id]
    )
  }

  const summary = dryRun
    ? `Dry run: ${updated} of ${rows.length} matching products would be updated.`
    : `Updated ${updated} of ${rows.length} matching products.`
  console.log(
    skipped > 0
      ? `${summary} ${skipped} skipped (matched SQL but cleanup produced identical text — re-run after deploying strip fixes).`
      : summary
  )

  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
