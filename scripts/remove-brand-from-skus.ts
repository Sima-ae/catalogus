#!/usr/bin/env npx tsx
/**
 * Remove brand-name prefix segments from product SKUs (e.g. LOUIS-VUITTON-63229531 → 63229531).
 *
 *   npx tsx scripts/remove-brand-from-skus.ts --dry-run
 *   npx tsx scripts/remove-brand-from-skus.ts
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { brandSkuPrefix, stripBrandPrefixFromSku } from '@/lib/product-sku'

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

type ProductRow = { id: string; sku: string; brand: string | null }

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  try {
    const [{ total }] = await queryDb<{ total: number }[]>(
      `SELECT COUNT(*) AS total FROM products`
    )

    const brands = await queryDb<{ name: string }[]>(
      `SELECT DISTINCT name FROM brands WHERE name IS NOT NULL AND TRIM(name) <> ''`
    )
    const brandsByPrefixLen = [...brands].sort(
      (a, b) => brandSkuPrefix(b.name).length - brandSkuPrefix(a.name).length
    )

    const rows = await queryDb<ProductRow[]>(
      `SELECT p.id, p.sku, COALESCE(b.name, NULLIF(TRIM(p.brand), '')) AS brand
       FROM products p
       LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.sku IS NOT NULL AND TRIM(p.sku) <> ''`
    )

    console.log(`Products: ${total}`)
    console.log(`Rows with SKU: ${rows.length}`)
    console.log(`Known brands: ${brands.length}`)

    const updates: { id: string; sku: string; cleaned: string }[] = []

    for (const row of rows) {
      let cleaned = stripBrandPrefixFromSku(row.sku, row.brand)
      if (cleaned === row.sku && !row.brand) {
        for (const b of brandsByPrefixLen) {
          const attempt = stripBrandPrefixFromSku(row.sku, b.name)
          if (attempt !== row.sku) {
            cleaned = attempt
            break
          }
        }
      }
      if (cleaned && cleaned !== row.sku) {
        updates.push({ id: row.id, sku: row.sku, cleaned })
      }
    }

    console.log(`SKUs to update: ${updates.length}`)

    for (let i = 0; i < Math.min(20, updates.length); i++) {
      const u = updates[i]
      console.log(`- ${u.id}: "${u.sku}" → "${u.cleaned}"`)
    }

    const resolved = resolveSkuCollisions(updates, rows)
    const suffixed = resolved.filter((u) => u.cleaned !== updates.find((x) => x.id === u.id)?.cleaned)
    if (suffixed.length > 0) {
      console.log(`Collision suffixes applied: ${suffixed.length}`)
      for (let i = 0; i < Math.min(5, suffixed.length); i++) {
        const u = suffixed[i]
        const orig = updates.find((x) => x.id === u.id)
        console.log(`  collision: "${orig?.cleaned}" → "${u.cleaned}"`)
      }
    }

    if (resolved.length === 0) return

    if (dryRun) {
      console.log('\nDry run only — no changes applied.')
      return
    }

    console.log('\nUpdating SKUs…')
    const batchSize = 200
    for (let i = 0; i < resolved.length; i += batchSize) {
      const batch = resolved.slice(i, i + batchSize)
      const cases = batch.map(() => 'WHEN ? THEN ?').join(' ')
      const ids = batch.map((u) => u.id)
      const params: string[] = []
      for (const u of batch) {
        params.push(u.id, u.cleaned)
      }
      params.push(...ids)
      await queryDb(
        `UPDATE products SET sku = CASE id ${cases} ELSE sku END WHERE id IN (${ids.map(() => '?').join(',')})`,
        [...params]
      )
      if ((i + batchSize) % 2000 === 0 || i + batchSize >= resolved.length) {
        console.log(`  ${Math.min(i + batchSize, resolved.length)} / ${resolved.length}`)
      }
    }

    console.log('Fixing empty SKUs…')
    await queryDb(
      `UPDATE products
       SET sku = CONCAT('LEGACY-', LEFT(id, 8))
       WHERE sku IS NULL OR TRIM(sku) = ''`
    )

    console.log('De-duplicating SKUs…')
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

    console.log('\nDone.')
  } finally {
    await resetDbPool().catch(() => {})
  }
}

function resolveSkuCollisions(
  updates: { id: string; sku: string; cleaned: string }[],
  allRows: ProductRow[]
): { id: string; sku: string; cleaned: string }[] {
  const updateIds = new Set(updates.map((u) => u.id))
  const taken = new Set<string>()

  for (const row of allRows) {
    if (!updateIds.has(row.id)) {
      taken.add(row.sku.toLowerCase())
    }
  }

  const sorted = [...updates].sort((a, b) => a.id.localeCompare(b.id))
  const out: { id: string; sku: string; cleaned: string }[] = []

  for (const u of sorted) {
    let cleaned = u.cleaned
    if (taken.has(cleaned.toLowerCase())) {
      cleaned = `${cleaned.slice(0, 246)}-${u.id.slice(0, 8)}`
    }
    taken.add(cleaned.toLowerCase())
    out.push({ ...u, cleaned })
  }

  return out
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
