/**
 * Investigate who set pricelist prices to €600 (or another amount).
 * Uses seller_product_prices.updated_by / updated_at — the app does not write file logs for saves.
 *
 *   npm run db:tunnel          # in another terminal
 *   npm run db:investigate-pricelist-600
 *   npm run db:investigate-pricelist-600 -- --price=600
 */
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { queryDb } from '../src/lib/db'
import { PLATFORM_PRICELIST_OWNER_ID } from '../src/lib/pricelist-constants'

type Row = {
  updated_by: string | null
  actor_label: string
  actor_role: string | null
  price_rows: number
  first_at: string
  last_at: string
  with_shipping_zero: number
}

function parseTargetPrice(): number {
  const arg = process.argv.find((a) => a.startsWith('--price='))
  if (!arg) return 600
  const n = Number(arg.slice('--price='.length))
  if (!Number.isFinite(n)) throw new Error('Invalid --price value')
  return n
}

async function main() {
  ensureEnvLoaded()
  const targetPrice = parseTargetPrice()

  const [totals] = await queryDb<
    { on_pricelist: number; at_target: number; with_numeric_price: number }[]
  >(
    `SELECT
       (SELECT COUNT(*) FROM pricelist_items WHERE owner_user_id = ?) AS on_pricelist,
       (SELECT COUNT(DISTINCT spp.product_id)
        FROM seller_product_prices spp
        INNER JOIN pricelist_items pi
          ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
        WHERE spp.unit_price = ?) AS at_target,
       (SELECT COUNT(DISTINCT spp.product_id)
        FROM seller_product_prices spp
        INNER JOIN pricelist_items pi
          ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
        WHERE spp.unit_price > 0) AS with_numeric_price`,
    [
      PLATFORM_PRICELIST_OWNER_ID,
      PLATFORM_PRICELIST_OWNER_ID,
      targetPrice,
      PLATFORM_PRICELIST_OWNER_ID,
    ]
  )

  console.log(`\n=== Platform pricelist price investigation (€${targetPrice}) ===\n`)
  console.log(`Products on pricelist:        ${totals.on_pricelist}`)
  console.log(`With any numeric price:       ${totals.with_numeric_price}`)
  console.log(`With unit_price = ${targetPrice}:      ${totals.at_target}`)

  const byActor = await queryDb<Row[]>(
    `SELECT
       spp.updated_by,
       COALESCE(u.email, up.email, '(share-link supplier / unknown id)') AS actor_label,
       COALESCE(u.role, up.role) AS actor_role,
       COUNT(*) AS price_rows,
       MIN(spp.updated_at) AS first_at,
       MAX(spp.updated_at) AS last_at,
       SUM(CASE WHEN spp.shipping_cost = 0 THEN 1 ELSE 0 END) AS with_shipping_zero
     FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     LEFT JOIN users u ON u.id = spp.updated_by
     LEFT JOIN user_profiles up ON up.id = spp.updated_by
     WHERE spp.unit_price = ?
     GROUP BY spp.updated_by, actor_label, actor_role
     ORDER BY price_rows DESC, last_at DESC`,
    [PLATFORM_PRICELIST_OWNER_ID, targetPrice]
  )

  if (!byActor.length) {
    console.log(`\nNo seller_product_prices rows at €${targetPrice} on the platform pricelist.`)
    return
  }

  console.log('\n--- Who set €' + targetPrice + ' (grouped by updated_by) ---\n')
  for (const row of byActor) {
    const guest =
      row.actor_label === '(share-link supplier / unknown id)' ? ' [likely pricelist password guest]' : ''
    console.log(
      `${row.price_rows} row(s) | ${row.actor_label}${guest}` +
        (row.actor_role ? ` (${row.actor_role})` : '') +
        `\n  updated_by: ${row.updated_by ?? '(null)'}` +
        `\n  first: ${row.first_at}  last: ${row.last_at}` +
        `\n  shipping €0 on ${row.with_shipping_zero} of these row(s)\n`
    )
  }

  const hourly = await queryDb<{ hour_bucket: string; cnt: number }[]>(
    `SELECT DATE_FORMAT(spp.updated_at, '%Y-%m-%d %H:00') AS hour_bucket,
            COUNT(*) AS cnt
     FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     WHERE spp.unit_price = ?
     GROUP BY hour_bucket
     ORDER BY hour_bucket DESC
     LIMIT 24`,
    [PLATFORM_PRICELIST_OWNER_ID, targetPrice]
  )

  console.log('--- When (rows per hour, newest first) ---\n')
  for (const row of hourly) {
    console.log(`  ${row.hour_bucket}  →  ${row.cnt} row(s)`)
  }

  const samples = await queryDb<
    { product_id: string; sku: string; name: string; updated_at: string; updated_by: string | null }[]
  >(
    `SELECT p.id AS product_id, p.sku, p.name, spp.updated_at, spp.updated_by
     FROM seller_product_prices spp
     INNER JOIN pricelist_items pi
       ON pi.product_id = spp.product_id AND pi.owner_user_id = ?
     INNER JOIN products p ON p.id = spp.product_id
     WHERE spp.unit_price = ?
     ORDER BY spp.updated_at DESC
     LIMIT 8`,
    [PLATFORM_PRICELIST_OWNER_ID, targetPrice]
  )

  console.log('\n--- Sample products (most recently updated) ---\n')
  for (const row of samples) {
    console.log(`  ${row.sku || row.product_id}  ${row.name}  @ ${row.updated_at}`)
  }

  console.log(
    '\nNote: bulk “Prijs instellen” / “Set price” applies one amount to all selected rows.' +
      '\n“Alle X met deze filters selecteren” can select thousands at once (limit 100k).'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
