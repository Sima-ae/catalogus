#!/usr/bin/env npx tsx
/**
 * Remove "YUPOO" from product SKUs (case-insensitive) across the whole catalog.
 *
 *   npx tsx scripts/remove-yupoo-from-skus.ts --dry-run
 *   npx tsx scripts/remove-yupoo-from-skus.ts
 *
 * Notes:
 * - Keeps existing SKU semantics, only strips "yupoo" and normalizes separators.
 * - Re-runs SKU empty-fill + de-duplication to preserve the unique SKU constraint.
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

type PreviewRow = { id: string; sku: string }

function cleanedSkuSqlExpression(): string {
  // 1) strip "yupoo" (any casing)
  // 2) normalize whitespace/underscores/hyphens to single hyphen
  // 3) trim hyphens at both ends
  // 4) cap to 255 chars (SKU column size)
  return `LEFT(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(sku, '(?i)yupoo', ''),
        '[ _-]+',
        '-'
      ),
      '(^-+|-+$)',
      ''
    ),
    255
  )`
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  try {
    const [{ total }] = await queryDb<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM products`
    )

    const [{ withYupoo }] = await queryDb<{ withYupoo: number }[]>(
      `SELECT COUNT(*) AS withYupoo FROM products WHERE sku REGEXP '(?i)yupoo'`
    )

    console.log(`Products: ${total}`)
    console.log(`SKUs containing "yupoo": ${withYupoo}`)

    if (withYupoo === 0) return

    const expr = cleanedSkuSqlExpression()

    const previewAfter = await queryDb<(PreviewRow & { cleaned_sku: string })[]>(
      `SELECT id, sku, ${expr} AS cleaned_sku
       FROM products
       WHERE sku REGEXP '(?i)yupoo'
       ORDER BY id
       LIMIT 20`
    )

    console.log('\nPreview (first 20 rows):')
    for (let i = 0; i < previewAfter.length; i++) {
      const row = previewAfter[i]
      console.log(`- ${row.id}: "${row.sku}" → "${row.cleaned_sku}"`)
    }

    if (dryRun) {
      console.log('\nDry run only — no changes applied.')
      return
    }

    console.log('\nUpdating SKUs…')
    await queryDb(
      `UPDATE products
       SET sku = ${expr}
       WHERE sku REGEXP '(?i)yupoo'`
    )

    console.log('Fixing empty SKUs…')
    await queryDb(
      `UPDATE products
       SET sku = CONCAT('LEGACY-', LEFT(id, 8))
       WHERE sku IS NULL OR TRIM(sku) = ''`
    )

    console.log('De-duplicating SKUs (preserve uniqueness)…')
    await queryDb(
      `UPDATE products p
       INNER JOIN (
         SELECT id
         FROM (
           SELECT
             id,
             ROW_NUMBER() OVER (
               PARTITION BY LOWER(TRIM(sku))
               ORDER BY created_at ASC, id ASC
             ) AS rn
           FROM products
           WHERE sku IS NOT NULL AND TRIM(sku) <> ''
         ) ranked
         WHERE ranked.rn > 1
       ) dup ON dup.id = p.id
       SET p.sku = CONCAT(LEFT(TRIM(p.sku), 246), '-', LEFT(p.id, 8))`
    )

    const [{ remaining }] = await queryDb<{ remaining: number }[]>(
      `SELECT COUNT(*) AS remaining FROM products WHERE sku REGEXP '(?i)yupoo'`
    )

    console.log(`\nDone. Remaining SKUs containing "yupoo": ${remaining}`)
  } finally {
    await resetDbPool().catch(() => {})
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})

