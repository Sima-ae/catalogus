/**
 * Fix Horloges sales prices that were wrongly set to purchase/pricelist unit_price.
 *
 * Context: restore-watch-sales-prices copied Mr. Huang pricelist unit_price into
 * products.price. Those unit prices are supplier purchase costs, not verkoop.
 *
 * Rules:
 *   - Purchase (inkoop) stays from supplier pricelist pages only — never jos/watches.
 *   - Sales (verkoop) for damaged rows (price == purchase_price) is restored from the
 *     modal sales price of still-correct Horloges with the same purchase_price.
 *
 * Requires DB tunnel: npm run db:tunnel
 *
 *   npx tsx scripts/one-off/fix-watch-sales-from-margin.ts --dry-run
 *   npx tsx scripts/one-off/fix-watch-sales-from-margin.ts
 */
import { createConnection, type RowDataPacket } from 'mysql2/promise'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const WATCHES_CATEGORY_ID = '11111111-1111-1111-1111-111111111111'
const PLATFORM_PRICELIST_ID = '00000000-0000-4000-8000-000000000001'

function readEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!existsSync(filePath)) return out
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
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
    out[key] = val
  }
  return out
}

function loadDotEnv() {
  const root = path.resolve(__dirname, '../..')
  for (const [k, v] of Object.entries(readEnvFile(path.join(root, '.env')))) {
    if (process.env[k] === undefined) process.env[k] = v
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')
  const uri = (process.env.DATABASE_URL ?? '').replace(/^mariadb:/, 'mysql:')
  if (!uri) throw new Error('DATABASE_URL missing')

  const conn = await createConnection({ uri, connectTimeout: 60_000 })

  try {
    // 1) Ensure purchase_price matches assigned supplier pricelist unit_price
    const [purchaseMismatch] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS n
       FROM products p
       INNER JOIN seller_product_prices spp
         ON spp.product_id = p.id
        AND spp.list_owner_id = COALESCE(p.supplier_pricelist_id, ?)
       WHERE p.status <> 'trash'
         AND p.category_id = ?
         AND COALESCE(spp.unit_price, 0) > 0
         AND ROUND(COALESCE(p.purchase_price, 0), 2) <> ROUND(spp.unit_price, 2)`,
      [PLATFORM_PRICELIST_ID, WATCHES_CATEGORY_ID]
    )
    const mismatchN = Number(purchaseMismatch[0]?.n ?? 0)
    console.log(`Purchase mismatches vs supplier pricelist: ${mismatchN}`)

    if (mismatchN > 0 && !dryRun) {
      const [res] = await conn.query(
        `UPDATE products p
         INNER JOIN seller_product_prices spp
           ON spp.product_id = p.id
          AND spp.list_owner_id = COALESCE(p.supplier_pricelist_id, ?)
         SET p.purchase_price = spp.unit_price
         WHERE p.status <> 'trash'
           AND p.category_id = ?
           AND COALESCE(spp.unit_price, 0) > 0
           AND ROUND(COALESCE(p.purchase_price, 0), 2) <> ROUND(spp.unit_price, 2)`,
        [PLATFORM_PRICELIST_ID, WATCHES_CATEGORY_ID]
      )
      console.log('Synced purchase from supplier pricelist:', (res as { affectedRows?: number }).affectedRows)
    }

    // 2) Build modal sales map from healthy Horloges (sales > purchase)
    const [healthy] = await conn.query<RowDataPacket[]>(
      `SELECT ROUND(p.purchase_price, 2) AS purch, ROUND(p.price, 2) AS sales, COUNT(*) AS cnt
       FROM products p
       WHERE p.status <> 'trash'
         AND p.category_id = ?
         AND COALESCE(p.purchase_price, 0) > 0
         AND COALESCE(p.price, 0) > COALESCE(p.purchase_price, 0)
       GROUP BY ROUND(p.purchase_price, 2), ROUND(p.price, 2)
       ORDER BY purch ASC, cnt DESC`,
      [WATCHES_CATEGORY_ID]
    )

    const salesByPurchase = new Map<number, number>()
    for (const row of healthy) {
      const purch = Number(row.purch)
      if (salesByPurchase.has(purch)) continue // first = highest cnt due to ORDER BY
      salesByPurchase.set(purch, Number(row.sales))
    }
    console.log(
      'Sales restore map (purchase → sales):',
      Object.fromEntries([...salesByPurchase.entries()].map(([k, v]) => [k.toFixed(2), v.toFixed(2)]))
    )

    // 3) Find damaged rows: sales == purchase
    const [bad] = await conn.query<RowDataPacket[]>(
      `SELECT p.id, p.sku, ROUND(p.price, 2) AS price, ROUND(p.purchase_price, 2) AS purchase_price
       FROM products p
       WHERE p.status <> 'trash'
         AND p.category_id = ?
         AND COALESCE(p.price, 0) > 0
         AND COALESCE(p.purchase_price, 0) > 0
         AND ROUND(p.price, 2) = ROUND(p.purchase_price, 2)`,
      [WATCHES_CATEGORY_ID]
    )

    let updated = 0
    let skipped = 0
    const byTarget = new Map<string, number>()

    for (const row of bad) {
      const purchase = Number(row.purchase_price)
      const target = salesByPurchase.get(round2(purchase))
      if (target == null || !(target > purchase)) {
        skipped += 1
        console.warn(`No sales map for purchase ${purchase} (sku ${row.sku})`)
        continue
      }
      const key = `${purchase.toFixed(2)}→${target.toFixed(2)}`
      byTarget.set(key, (byTarget.get(key) ?? 0) + 1)

      if (!dryRun) {
        await conn.query(`UPDATE products SET price = ? WHERE id = ?`, [target, row.id])
      }
      updated += 1
    }

    console.log(dryRun ? 'DRY-RUN would update:' : 'Updated:', updated)
    console.log('Skipped (no map):', skipped)
    console.log('By mapping:', Object.fromEntries(byTarget))

    if (!dryRun) {
      const [[stats]] = await conn.query<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN ROUND(price,2)=ROUND(purchase_price,2) THEN 1 ELSE 0 END) AS sales_eq_purchase,
           SUM(CASE WHEN price > purchase_price THEN 1 ELSE 0 END) AS with_margin
         FROM products
         WHERE status <> 'trash' AND category_id = ?`,
        [WATCHES_CATEGORY_ID]
      )
      console.log('After fix:', stats)
    }
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
