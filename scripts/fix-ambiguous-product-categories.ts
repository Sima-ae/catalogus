#!/usr/bin/env npx tsx
/**
 * Fix ambiguous product category strings (e.g. bare "SHOES" when category_id is SOCCER › SHOES).
 *
 *   npm run db:fix-product-categories
 *   npm run db:fix-product-categories -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { buildCategoryPickerOptions, type CategoryPickerOption } from '@/lib/category-picker'
import {
  categoryIdsFromCompound,
  joinCategoryStorageLabels,
  primaryCategoryId,
} from '@/lib/product-taxonomy'

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

type CategoryRow = {
  id: string
  name: string
  parent_id: string | null
  parent_name: string | null
}

type ProductRow = {
  id: string
  category: string | null
  category_id: string | null
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const categoryRows = await queryDb<CategoryRow[]>(
    `SELECT c.id, c.name, c.parent_id, p.name AS parent_name
     FROM categories c
     LEFT JOIN categories p ON p.id = c.parent_id
     WHERE c.active = 1`
  )
  const options: CategoryPickerOption[] = buildCategoryPickerOptions(categoryRows)

  const products = await queryDb<ProductRow[]>(
    `SELECT id, category, category_id FROM products`
  )

  let updated = 0
  const preview: { id: string; before: string; after: string }[] = []

  for (const row of products) {
    const raw = String(row.category ?? '').trim()
    const ids = categoryIdsFromCompound(raw, options, row.category_id)
    if (!ids.length) continue

    const proper = joinCategoryStorageLabels(new Set(ids), options)
    const primaryId = primaryCategoryId(ids, options)
    if (!primaryId) continue

    if (proper === raw && (!row.category_id || row.category_id === primaryId)) continue

    if (preview.length < 8) {
      preview.push({ id: row.id, before: raw || '(empty)', after: proper })
    }

    updated++
    if (dryRun) continue

    await queryDb(`UPDATE products SET category = ?, category_id = ? WHERE id = ?`, [
      proper,
      primaryId,
      row.id,
    ])
  }

  console.log('Preview:')
  for (const p of preview) {
    console.log(`- ${p.id}`)
    console.log(`  before: ${p.before}`)
    console.log(`  after:  ${p.after}`)
  }

  console.log(
    dryRun
      ? `\nDry run: ${updated} of ${products.length} products would be updated.`
      : `\nUpdated ${updated} of ${products.length} products.`
  )
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
