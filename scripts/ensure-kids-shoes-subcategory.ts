#!/usr/bin/env npx tsx
/**
 * Ensure KIDS › SHOES exists and products use it (not top-level KIDS SHOES or bare SHOES).
 *
 *   npm run db:ensure-kids-shoes
 *   npm run db:ensure-kids-shoes -- --dry-run
 */
import { randomUUID } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { slugifyCategory } from '@/lib/category-slug'

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

type CategoryRow = { id: string; name: string; parent_id: string | null; active: number }

async function findTopLevelCategory(name: string): Promise<CategoryRow | null> {
  const rows = await queryDb<CategoryRow[]>(
    `SELECT id, name, parent_id, active FROM categories
     WHERE active = 1 AND LOWER(TRIM(name)) = LOWER(?)
       AND (parent_id IS NULL OR TRIM(parent_id) = '')
     LIMIT 1`,
    [name]
  )
  return rows[0] ?? null
}

async function findChildCategory(parentId: string, name: string): Promise<CategoryRow | null> {
  const rows = await queryDb<CategoryRow[]>(
    `SELECT id, name, parent_id, active FROM categories
     WHERE active = 1 AND parent_id = ? AND LOWER(TRIM(name)) = LOWER(?)
     LIMIT 1`,
    [parentId, name]
  )
  return rows[0] ?? null
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const kids = await findTopLevelCategory('KIDS')
  if (!kids) {
    console.error('Top-level KIDS category not found — create it in Admin → Categories first.')
    process.exitCode = 1
    return
  }

  let kidsShoes = await findChildCategory(kids.id, 'SHOES')
  const kidsShoesTop = await findTopLevelCategory('KIDS SHOES')

  if (!kidsShoes) {
    const id = randomUUID()
    console.log(`Creating KIDS › SHOES subcategory (${id})`)
    if (!dryRun) {
      await queryDb(
        `INSERT INTO categories (id, name, slug, description, parent_id, active)
         VALUES (?, 'SHOES', ?, NULL, ?, 1)`,
        [id, slugifyCategory('SHOES'), kids.id]
      )
      kidsShoes = { id, name: 'SHOES', parent_id: kids.id, active: 1 }
    } else {
      kidsShoes = { id: '(new)', name: 'SHOES', parent_id: kids.id, active: 1 }
    }
  } else {
    console.log(`KIDS › SHOES already exists (${kidsShoes.id})`)
  }

  if (!kidsShoes || kidsShoes.id === '(new)') {
    if (dryRun) {
      console.log('\nDry run complete — would create KIDS › SHOES.')
      return
    }
    kidsShoes = await findChildCategory(kids.id, 'SHOES')
  }

  if (!kidsShoes) {
    console.error('Could not resolve KIDS › SHOES category id.')
    process.exitCode = 1
    return
  }

  const storageLabel = 'KIDS › SHOES'
  let movedFromTop = 0
  let movedFromLabel = 0

  if (kidsShoesTop && kidsShoesTop.id !== kidsShoes.id) {
    const [{ c }] = await queryDb<{ c: number }[]>(
      `SELECT COUNT(*) AS c FROM products WHERE category_id = ?`,
      [kidsShoesTop.id]
    )
    console.log(`Top-level KIDS SHOES (${kidsShoesTop.id}): ${c} products to move`)
    if (c > 0 && !dryRun) {
      await queryDb(
        `UPDATE products SET category_id = ?, category = ? WHERE category_id = ?`,
        [kidsShoes.id, storageLabel, kidsShoesTop.id]
      )
    }
    movedFromTop = c
    if (!dryRun) {
      await queryDb(`UPDATE categories SET active = 0 WHERE id = ?`, [kidsShoesTop.id])
      console.log('Deactivated top-level KIDS SHOES category')
    }
  }

  const labelRows = await queryDb<{ id: string }[]>(
    `SELECT id FROM products
     WHERE category_id IS NULL OR category_id <> ?
       AND (
         LOWER(TRIM(category)) IN ('kids shoes', 'kids › shoes', 'kids > shoes')
         OR category LIKE '%KIDS SHOES%'
         OR category LIKE '%KIDS › SHOES%'
       )`,
    [kidsShoes.id]
  )
  movedFromLabel = labelRows.length
  if (labelRows.length > 0) {
    console.log(`${labelRows.length} products matched by category label — updating to KIDS › SHOES`)
    if (!dryRun) {
      await queryDb(
        `UPDATE products SET category_id = ?, category = ?
         WHERE category_id IS NULL OR category_id <> ?
           AND (
             LOWER(TRIM(category)) IN ('kids shoes', 'kids › shoes', 'kids > shoes')
             OR category LIKE '%KIDS SHOES%'
             OR category LIKE '%KIDS › SHOES%'
           )`,
        [kidsShoes.id, storageLabel, kidsShoes.id]
      )
    }
  }

  const [{ activeCount }] = await queryDb<{ activeCount: number }[]>(
    `SELECT COUNT(*) AS activeCount FROM products
     WHERE status = 'active' AND category_id = ?`,
    [kidsShoes.id]
  )

  console.log(
    dryRun
      ? `\nDry run: would move ${movedFromTop} from top-level KIDS SHOES, ${movedFromLabel} by label.`
      : `\nDone. Active products on KIDS › SHOES: ${activeCount} (subcategory pill shows when > 0).`
  )
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
