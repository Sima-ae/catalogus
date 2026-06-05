#!/usr/bin/env npx tsx
/**
 * Remove "Guanhui foreign trade" / 冠汇外贸 from all product titles.
 *
 *   npm run db:clean-product-titles
 *   npm run db:clean-product-titles -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { sanitizeProductName } from '@/lib/yupoo/import-text'

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
}

async function countPattern(pattern: string): Promise<number> {
  const [{ c }] = await queryDb<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM products WHERE name LIKE ?`,
    [`%${pattern}%`]
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
  console.log('  Guanhui foreign trade:', await countPattern('Guanhui foreign trade'))
  console.log('  冠汇外贸:', await countPattern('冠汇外贸'))

  const rows = await queryDb<ProductRow[]>(`SELECT id, name FROM products`)

  let updated = 0
  const preview: { id: string; before: string; after: string }[] = []

  for (const row of rows) {
    const rawName = String(row.name ?? '').trim()
    const cleaned = sanitizeProductName(rawName)
    if (!cleaned || cleaned === rawName) continue

    if (preview.length < 8) {
      preview.push({ id: row.id, before: rawName, after: cleaned })
    }

    updated++
    if (dryRun) continue

    await queryDb(`UPDATE products SET name = ? WHERE id = ?`, [cleaned, row.id])
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
      ? `\nDry run: ${updated} of ${rows.length} products would be updated.`
      : `\nUpdated ${updated} of ${rows.length} products.`
  )

  if (!dryRun) {
    console.log('\nAfter cleanup:')
    console.log('  Guanhui foreign trade:', await countPattern('Guanhui foreign trade'))
    console.log('  冠汇外贸:', await countPattern('冠汇外贸'))
  }
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
