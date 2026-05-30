#!/usr/bin/env npx tsx
/**
 * Re-clean product descriptions (removes Yupoo trademark boilerplate, keeps "Brand" prefix).
 *
 *   npm run db:clean-descriptions
 *   npm run db:clean-descriptions -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb } from '@/lib/db'
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
     WHERE description IS NOT NULL OR short_description IS NOT NULL`
  )

  let updated = 0
  let scanned = 0

  for (const row of rows) {
    scanned++
    const name = String(row.name ?? '').trim()
    const brand = row.brand?.trim() || null
    const rawDescription = String(row.description ?? '').trim()
    const rawShort = String(row.short_description ?? '').trim()

    const description = cleanImportDescription(rawDescription, name, brand)
    const shortFromDesc =
      catalogCardDescription(name, description, undefined, brand).slice(0, 280) || ''
    const short_description = rawShort
      ? cleanImportDescription(rawShort, name, brand).slice(0, 280) || shortFromDesc || null
      : shortFromDesc || null

    const descChanged = description !== rawDescription
    const shortChanged = (short_description ?? '') !== rawShort

    if (!descChanged && !shortChanged) continue

    updated++
    if (dryRun) {
      console.log(`[dry-run] ${row.id} ${name}`)
      if (descChanged) {
        console.log('  before:', rawDescription.slice(0, 120))
        console.log('  after: ', description.slice(0, 120))
      }
      continue
    }

    await queryDb(
      `UPDATE products SET description = ?, short_description = ? WHERE id = ?`,
      [description, short_description, row.id]
    )
  }

  console.log(
    dryRun
      ? `Dry run: ${updated} of ${scanned} products would be updated.`
      : `Updated ${updated} of ${scanned} products.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
