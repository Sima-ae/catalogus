#!/usr/bin/env npx tsx
/**
 * Remove Yupoo supplier / fabric shop boilerplate from all product descriptions.
 * Brand names in copy are preserved.
 *
 *   npm run db:clean-supplier-descriptions
 *   npm run db:clean-supplier-descriptions -- --dry-run
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

type ProductRow = {
  id: string
  name: string
  description: string | null
  short_description: string | null
  brand: string | null
}

function cleanRow(row: ProductRow) {
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

  return { description, short_description, rawDescription, rawShort }
}

async function countPattern(pattern: string): Promise<number> {
  const [{ c }] = await queryDb<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM products
     WHERE description LIKE ? OR short_description LIKE ?`,
    [`%${pattern}%`, `%${pattern}%`]
  )
  return c
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const [{ total }] = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM products`
  )

  console.log(`Products: ${total}`)
  console.log('Before cleanup:')
  console.log('  Supplier Product Catalog:', await countPattern('Supplier Product Catalog'))
  console.log('  Guangtai:', await countPattern('Guangtai'))
  console.log('  Yangli:', await countPattern('Yangli'))
  console.log('  Niuli:', await countPattern('Niuli'))

  if (!dryRun) {
    console.log('\nBulk SQL: removing trailing "Supplier Product Catalog"…')
    await queryDb(
      `UPDATE products
       SET description = TRIM(
         REGEXP_REPLACE(description, '[[:space:]]*[-–—|｜]+[[:space:]]*Supplier[[:space:]]+Product[[:space:]]+Catalog[[:space:]]*$', '')
       )
       WHERE description LIKE '%Supplier Product Catalog%'`
    )
    await queryDb(
      `UPDATE products
       SET short_description = TRIM(
         REGEXP_REPLACE(short_description, '[[:space:]]*[-–—|｜]+[[:space:]]*Supplier[[:space:]]+Product[[:space:]]+Catalog[[:space:]]*$', '')
       )
       WHERE short_description LIKE '%Supplier Product Catalog%'`
    )
  }

  const rows = await queryDb<ProductRow[]>(
    `SELECT id, name, description, short_description, brand FROM products`
  )

  let updated = 0
  let scanned = 0
  const preview: { id: string; before: string; after: string }[] = []

  for (const row of rows) {
    scanned++
    const { description, short_description, rawDescription, rawShort } = cleanRow(row)
    const descChanged = description !== rawDescription
    const shortChanged = (short_description ?? '') !== rawShort
    if (!descChanged && !shortChanged) continue

    if (preview.length < 5) {
      preview.push({
        id: row.id,
        before: rawDescription.slice(0, 100),
        after: description.slice(0, 100) || '(empty)',
      })
    }

    updated++
    if (dryRun) continue

    await queryDb(`UPDATE products SET description = ?, short_description = ? WHERE id = ?`, [
      description,
      short_description,
      row.id,
    ])

    if (updated % 500 === 0) {
      console.log(`Updated ${updated}…`)
    }
  }

  console.log('\nPreview:')
  for (const p of preview) {
    console.log(`- ${p.id}`)
    console.log(`  before: ${p.before}`)
    console.log(`  after:  ${p.after}`)
  }

  console.log(
    dryRun
      ? `\nDry run: ${updated} of ${scanned} products would be updated.`
      : `\nUpdated ${updated} of ${scanned} products.`
  )

  console.log('\nAfter cleanup:')
  console.log('  Supplier Product Catalog:', await countPattern('Supplier Product Catalog'))
  console.log('  Guangtai:', await countPattern('Guangtai'))
  console.log('  Yangli:', await countPattern('Yangli'))
  console.log('  Niuli:', await countPattern('Niuli'))
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
