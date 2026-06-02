#!/usr/bin/env npx tsx
/**
 * Remove "Guangzhou Keshi Clothing" supplier boilerplate from product descriptions.
 *
 *   npm run db:remove-keshi-descriptions
 *   npm run db:remove-keshi-descriptions -- --dry-run
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'

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

/** Strip Guangzhou Keshi supplier header (and its usual suffix) from description text. */
export function stripGuangzhouKeshiFromDescription(text: string): string {
  let result = String(text ?? '').trim()
  if (!result) return result

  // Full line: Guangzhou Keshi Clothing [Exclusive …] - Supplier Product Catalog
  result = result.replace(
    /guangzhou\s+keshi\s+clothing(?:\s*\[[^\]]*\])?(?:\s*[-–—|｜]\s*)?(?:supplier\s+product\s+catalog)?/gi,
    ' '
  )
  result = result.replace(/guangzhou\s+keshi\s+clothing/gi, ' ')
  result = result.replace(
    /\[(?:exclusive\s+cross-border\s+supply,\s*affordable\s+and\s+transparent)\]/gi,
    ' '
  )

  result = result
    .replace(/\s+/g, ' ')
    .replace(/^[|｜\-–—:：,，.\s]+/, '')
    .replace(/[|｜\-–—:：,，.\s]+$/, '')
    .trim()

  return result
}

function needsKeshiCleanup(text: string | null): boolean {
  return /guangzhou\s+keshi/i.test(String(text ?? ''))
}

type ProductRow = {
  id: string
  description: string | null
  short_description: string | null
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const [{ total }] = await queryDb<{ total: number }[]>(
    `SELECT COUNT(*) AS total FROM products`
  )

  const rows = await queryDb<ProductRow[]>(
    `SELECT id, description, short_description
     FROM products
     WHERE description REGEXP '(?i)guangzhou[[:space:]]*keshi'
        OR short_description REGEXP '(?i)guangzhou[[:space:]]*keshi'`
  )

  console.log(`Products: ${total}`)
  console.log(`Rows with Guangzhou Keshi text: ${rows.length}`)

  if (rows.length === 0) return

  const preview = rows.slice(0, 5)
  console.log('\nPreview:')
  for (const row of preview) {
    const before = String(row.description ?? '').trim()
    const after = stripGuangzhouKeshiFromDescription(before)
    console.log(`- ${row.id}`)
    console.log(`  before: ${before.slice(0, 100)}`)
    console.log(`  after:  ${after.slice(0, 100) || '(empty)'}`)
  }

  if (dryRun) {
    console.log('\nDry run only — no changes applied.')
    return
  }

  console.log('\nUpdating descriptions (bulk SQL)…')
  await queryDb(
    `UPDATE products
     SET description = TRIM(
       REGEXP_REPLACE(
         REGEXP_REPLACE(
           COALESCE(description, ''),
           '(?i)guangzhou[[:space:]]+keshi[[:space:]]+clothing[[:space:]]*\\[[^\\]]*\\][[:space:]]*[-–—|｜]?[[:space:]]*supplier[[:space:]]+product[[:space:]]+catalog',
           ''
         ),
         '(?i)guangzhou[[:space:]]+keshi[[:space:]]+clothing',
         ''
       )
     )
     WHERE description REGEXP '(?i)guangzhou[[:space:]]*keshi'`
  )

  console.log('Updating short descriptions (bulk SQL)…')
  await queryDb(
    `UPDATE products
     SET short_description = TRIM(
       REGEXP_REPLACE(
         REGEXP_REPLACE(
           COALESCE(short_description, ''),
           '(?i)guangzhou[[:space:]]+keshi[[:space:]]+clothing[[:space:]]*\\[[^\\]]*\\][[:space:]]*[-–—|｜]?[[:space:]]*supplier[[:space:]]+product[[:space:]]+catalog',
           ''
         ),
         '(?i)guangzhou[[:space:]]+keshi[[:space:]]+clothing',
         ''
       )
     )
     WHERE short_description REGEXP '(?i)guangzhou[[:space:]]*keshi'`
  )

  const updated = rows.length

  const [{ remaining }] = await queryDb<{ remaining: number }[]>(
    `SELECT COUNT(*) AS remaining FROM products
     WHERE description REGEXP '(?i)guangzhou[[:space:]]*keshi'
        OR short_description REGEXP '(?i)guangzhou[[:space:]]*keshi'`
  )

  console.log(`\nDone. Updated ${updated} products. Remaining with Guangzhou Keshi: ${remaining}`)
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
