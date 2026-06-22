#!/usr/bin/env npx tsx
/**
 * Fill missing product brands for import categories (detect from title/description, else - MIXED -).
 *
 *   npm run db:fix-missing-import-brands -- --dry-run
 *   npm run db:fix-missing-import-brands
 *   npm run db:fix-missing-import-brands -- --categories=JEWELRY,HATS,BELTS
 *   npm run db:fix-missing-import-brands -- --all-categories
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool } from '@/lib/db'
import { getAllBrandNames } from '@/lib/brand-sku-prefixes'
import { productsHaveBrandIdColumn, resolveProductBrandInput } from '@/lib/brands-db'
import { resolveImportBrandFromProductText } from '@/lib/product-brand-text'

const DEFAULT_CATEGORIES = ['JEWELRY', 'HATS', 'BELTS']

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

export function productCategoryMatchesFilter(
  row: Pick<ProductRow, 'category' | 'category_name'>,
  filters: string[]
): boolean {
  const labels = [row.category, row.category_name]
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter(Boolean)

  return filters.some((filter) => {
    const needle = filter.trim().toUpperCase()
    if (!needle) return false
    return labels.some(
      (label) =>
        label === needle || label.endsWith(`› ${needle}`) || label.includes(needle)
    )
  })
}

function hasMissingBrand(brand: string | null | undefined): boolean {
  return !String(brand ?? '').trim()
}

async function main() {
  ensureEnvLoaded()

  const dryRun = process.argv.includes('--dry-run')
  const allCategories = process.argv.includes('--all-categories')
  const categoriesRaw = parseArgValue('categories')
  const categoryFilters = allCategories
    ? []
    : (categoriesRaw ?? DEFAULT_CATEGORIES.join(','))
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
  const limit = parseArgInt('limit', 0)
  const verbose = process.argv.includes('--verbose')

  const brandNames = await getAllBrandNames()
  const hasBrandId = await productsHaveBrandIdColumn()

  const rows = await queryDb<ProductRow[]>(
    `SELECT p.id, p.name, p.description, p.short_description, p.brand, p.category, p.category_id,
            c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.brand IS NULL OR TRIM(p.brand) = ''
     ORDER BY p.created_at ASC`
  )

  const candidates = allCategories
    ? rows.filter((row) => hasMissingBrand(row.brand))
    : rows.filter(
        (row) => hasMissingBrand(row.brand) && productCategoryMatchesFilter(row, categoryFilters)
      )

  const work = limit > 0 ? candidates.slice(0, limit) : candidates

  let updated = 0
  let unchanged = 0
  let failed = 0

  console.log(
    `Fix missing import brands: ${work.length} of ${candidates.length} candidates` +
      `${allCategories ? ' (all categories)' : ` (${categoryFilters.join(', ')})`}` +
      `${dryRun ? ', dry-run' : ''}`
  )

  for (const row of work) {
    const nextBrand = resolveImportBrandFromProductText(
      {
        name: row.name,
        description: row.description,
        short_description: row.short_description,
      },
      null,
      brandNames
    )

    if (!nextBrand.trim()) {
      unchanged++
      continue
    }

    try {
      if (dryRun) {
        updated++
        if (verbose) {
          console.log(`DRY ${row.id}: — → ${nextBrand} — "${String(row.name ?? '').slice(0, 70)}"`)
        }
        continue
      }

      const resolved = await resolveProductBrandInput(nextBrand)
      const sets = ['brand = ?']
      const params: unknown[] = [resolved.name]

      if (hasBrandId && resolved.id) {
        sets.push('brand_id = ?')
        params.push(resolved.id)
      }

      params.push(row.id)
      await queryDb(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, params)
      updated++
      if (verbose) {
        console.log(`OK ${row.id}: — → ${resolved.name}`)
      }
    } catch (err) {
      failed++
      console.error(
        `FAIL ${row.id}:`,
        err instanceof Error ? err.message : err
      )
    }
  }

  console.log(`Done. updated=${updated} unchanged=${unchanged} failed=${failed}`)
  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
