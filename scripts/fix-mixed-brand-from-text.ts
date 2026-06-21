#!/usr/bin/env npx tsx
/**
 * Assign real brands to products stuck on "- MIXED -" when title/description names a brand.
 *
 *   npm run db:fix-mixed-brands-from-text -- --dry-run
 *   npm run db:fix-mixed-brands-from-text
 *   npm run db:fix-mixed-brands-from-text -- --category=BAGS --brand="- MIXED -"
 *   npm run db:fix-mixed-brands-from-text -- --all-categories
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool } from '@/lib/db'
import { getAllBrandNames } from '@/lib/brand-sku-prefixes'
import { productsHaveBrandIdColumn, resolveProductBrandInput } from '@/lib/brands-db'
import {
  detectBrandsFromProductFields,
  isMixedBrandLabel,
} from '@/lib/product-brand-text'
import { joinBrandNames } from '@/lib/product-taxonomy'

function parseArgValue(name: string): string | null {
  const prefix = `--${name}=`
  const raw = process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length)
  return raw?.trim() || null
}

function parseArgInt(name: string, fallback: number): number {
  const raw = parseArgValue(name)
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

type ProductRow = {
  id: string
  name: string
  description: string | null
  short_description: string | null
  brand: string | null
  category: string
  category_id: string | null
  category_name: string | null
}

function categoryMatchesBags(row: ProductRow): boolean {
  const labels = [row.category, row.category_name]
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter(Boolean)

  return labels.some(
    (label) =>
      label === 'BAGS' ||
      label.endsWith('› BAGS') ||
      label.includes('BAGS')
  )
}

async function main() {
  ensureEnvLoaded()

  const dryRun = process.argv.includes('--dry-run')
  const allCategories = process.argv.includes('--all-categories')
  const categoryFilter = parseArgValue('category') ?? 'BAGS'
  const sourceBrand = parseArgValue('brand') ?? '- MIXED -'
  const limit = parseArgInt('limit', 0)
  const verbose = process.argv.includes('--verbose')

  const brandNames = await getAllBrandNames()
  const hasBrandId = await productsHaveBrandIdColumn()

  const rows = await queryDb<ProductRow[]>(
    `SELECT p.id, p.name, p.description, p.short_description, p.brand, p.category, p.category_id,
            c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.brand IS NOT NULL AND TRIM(p.brand) <> ''
     ORDER BY p.created_at ASC`
  )

  const candidates = rows.filter((row) => {
    if (!isMixedBrandLabel(row.brand) && row.brand?.trim() !== sourceBrand.trim()) {
      return false
    }
    if (allCategories) return true
    if (categoryFilter.toUpperCase() === 'BAGS') {
      return categoryMatchesBags(row)
    }
    const needle = categoryFilter.trim().toUpperCase()
    const labels = [row.category, row.category_name]
      .map((value) => String(value ?? '').trim().toUpperCase())
      .filter(Boolean)
    return labels.some((label) => label === needle || label.includes(needle))
  })

  const work = limit > 0 ? candidates.slice(0, limit) : candidates

  let updated = 0
  let skippedNoMatch = 0
  let skippedSame = 0
  let failed = 0

  console.log(
    `Fix MIXED → detected brand: ${work.length} of ${candidates.length} candidates` +
      `${allCategories ? ' (all categories)' : ` (category ~ ${categoryFilter})`}` +
      `${dryRun ? ', dry-run' : ''}`
  )

  for (const row of work) {
    const detected = detectBrandsFromProductFields(row, brandNames, {
      excludeNames: [sourceBrand, '- MIXED -', 'MIXED'],
    })

    if (!detected.length) {
      skippedNoMatch++
      if (verbose) {
        console.warn(`SKIP ${row.id}: no brand in text — "${String(row.name ?? '').slice(0, 70)}"`)
      }
      continue
    }

    const nextBrand = joinBrandNames(new Set(detected), brandNames)
    const currentBrand = String(row.brand ?? '').trim()
    if (nextBrand === currentBrand) {
      skippedSame++
      continue
    }

    try {
      const resolved = await resolveProductBrandInput(nextBrand)
      updated++

      if (dryRun) {
        console.log(
          `[dry-run] ${row.id}: "${currentBrand}" → "${resolved.name}" | ${String(row.name ?? '').slice(0, 80)}`
        )
        continue
      }

      if (hasBrandId && resolved.id) {
        await queryDb(`UPDATE products SET brand = ?, brand_id = ? WHERE id = ?`, [
          resolved.name,
          resolved.id,
          row.id,
        ])
      } else {
        await queryDb(`UPDATE products SET brand = ? WHERE id = ?`, [resolved.name, row.id])
      }

      console.log(`updated ${row.id}: ${resolved.name}`)
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : String(err)
      console.error(`FAIL ${row.id} (${nextBrand}): ${message}`)
    }
  }

  console.log(
    `Done. updated=${updated} skipped_no_match=${skippedNoMatch} skipped_same=${skippedSame} failed=${failed}` +
      `${dryRun ? ' (dry-run)' : ''}`
  )

  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
