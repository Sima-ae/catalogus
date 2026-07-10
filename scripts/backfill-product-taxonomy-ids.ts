#!/usr/bin/env npx tsx
/**
 * Backfill products.category_id and products.brand_id for indexed catalog filters.
 *
 *   npm run db:backfill-product-taxonomy-ids
 *   npm run db:backfill-product-taxonomy-ids -- --dry-run
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool } from '@/lib/db'
import { productsHaveBrandIdColumn } from '@/lib/brands-db'

async function runUpdate(label: string, sql: string, dryRun: boolean): Promise<number> {
  if (dryRun) {
    console.log(`  ${label}: skipped in dry-run`)
    return 0
  }
  const result = await queryDb<{ affectedRows?: number }>(sql)
  const affected = Number((result as { affectedRows?: number }).affectedRows ?? 0)
  console.log(`  ${label}: updated ${affected} rows`)
  return affected
}

async function batchUpdateBrandIds(
  pairs: Array<{ id: string; brandId: string }>
): Promise<number> {
  if (!pairs.length) return 0
  const batchSize = 250
  let updated = 0
  for (let i = 0; i < pairs.length; i += batchSize) {
    const chunk = pairs.slice(i, i + batchSize)
    const caseParts = chunk.map(() => 'WHEN ? THEN ?').join(' ')
    const ids = chunk.map((p) => p.id)
    const params: unknown[] = []
    for (const pair of chunk) {
      params.push(pair.id, pair.brandId)
    }
    params.push(...ids)
    await queryDb(
      `UPDATE products SET brand_id = CASE id ${caseParts} END
       WHERE id IN (${ids.map(() => '?').join(', ')})`,
      params
    )
    updated += chunk.length
  }
  return updated
}

async function backfillSoleBrandIds(dryRun: boolean): Promise<number> {
  if (dryRun) {
    console.log('  Exact sole brand name → brand_id: skipped in dry-run')
    return 0
  }
  const batchSize = 2000
  let total = 0
  for (;;) {
    const result = await queryDb<{ affectedRows?: number }>(
      `UPDATE products p
        INNER JOIN brands b ON b.active = 1 AND b.name = p.brand
        SET p.brand_id = b.id
        WHERE (p.brand_id IS NULL OR TRIM(p.brand_id) = '')
          AND TRIM(IFNULL(p.brand, '')) <> ''
          AND p.brand NOT LIKE '% X %'
        LIMIT ?`,
      [batchSize]
    )
    const affected = Number((result as { affectedRows?: number }).affectedRows ?? 0)
    total += affected
    if (affected > 0) console.log(`    … ${total} sole brands updated so far`)
    if (affected < batchSize) break
  }
  console.log(`  Exact sole brand name → brand_id: updated ${total} rows`)
  return total
}

async function main() {
  ensureEnvLoaded()
  const dryRun = process.argv.includes('--dry-run')
  const hasBrandId = await productsHaveBrandIdColumn()

  console.log(`Backfill product taxonomy ids${dryRun ? ' (dry-run)' : ''}…`)

  await runUpdate(
    'Import source catalog category',
    `UPDATE products p
      INNER JOIN import_job_items i ON i.product_id = p.id AND i.status IN ('imported', 'skipped')
      INNER JOIN import_jobs j ON j.id = i.job_id
      INNER JOIN import_sources s ON s.id = j.source_id AND s.catalog_category_id IS NOT NULL
      INNER JOIN categories c ON c.id = s.catalog_category_id AND c.active = 1
      SET p.category_id = c.id, p.category = c.name
      WHERE p.source_album_id IS NOT NULL
        AND (p.category_id IS NULL OR TRIM(p.category_id) = '')`,
    dryRun
  )

  await runUpdate(
    'Exact category name match',
    `UPDATE products p
      INNER JOIN categories c ON c.active = 1 AND c.name = p.category
      SET p.category_id = c.id
      WHERE (p.category_id IS NULL OR TRIM(p.category_id) = '')
        AND TRIM(IFNULL(p.category, '')) <> ''`,
    dryRun
  )

  if (hasBrandId) {
    await backfillSoleBrandIds(dryRun)

    if (!dryRun) {
      const [collabRows, brandRows] = await Promise.all([
        queryDb<{ id: string; brand: string }[]>(
          `SELECT p.id, p.brand
           FROM products p
           WHERE (p.brand_id IS NULL OR TRIM(p.brand_id) = '')
             AND TRIM(IFNULL(p.brand, '')) <> ''
             AND p.brand LIKE '% X %'`
        ),
        queryDb<{ id: string; name: string }[]>(
          `SELECT id, name FROM brands WHERE active = 1`
        ),
      ])
      const brandByName = new Map(brandRows.map((b) => [String(b.name).trim(), b.id] as const))
      const pairs: Array<{ id: string; brandId: string }> = []
      for (const row of collabRows) {
        const segments = String(row.brand)
          .split(/\s+X\s+/i)
          .map((s) => s.trim())
          .filter(Boolean)
        const lastSegment = segments[segments.length - 1]
        const brandId = lastSegment ? brandByName.get(lastSegment) : undefined
        if (brandId) pairs.push({ id: row.id, brandId })
      }
      const collabUpdated = await batchUpdateBrandIds(pairs)
      console.log(`  Collab brand (last segment) → brand_id: updated ${collabUpdated} rows`)
    } else {
      console.log('  Collab brand (last segment) → brand_id: skipped in dry-run')
    }
  } else {
    console.log('  brand_id column missing — skipped brand backfill')
  }

  const missingCategory = await queryDb<{ cnt: number }[]>(
    `SELECT COUNT(*) AS cnt FROM products
     WHERE (category_id IS NULL OR TRIM(category_id) = '')
       AND TRIM(IFNULL(category, '')) <> ''
       AND status != 'trash'`
  )
  const missingBrand = hasBrandId
    ? await queryDb<{ cnt: number }[]>(
        `SELECT COUNT(*) AS cnt FROM products
         WHERE (brand_id IS NULL OR TRIM(brand_id) = '')
           AND TRIM(IFNULL(brand, '')) <> ''
           AND status != 'trash'`
      )
    : [{ cnt: 0 }]

  console.log(
    `Remaining without category_id: ${Number(missingCategory[0]?.cnt ?? 0)}` +
      (hasBrandId ? `, without brand_id: ${Number(missingBrand[0]?.cnt ?? 0)}` : '')
  )
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => resetDbPool())
