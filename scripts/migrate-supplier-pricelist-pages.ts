/**
 * Backfill multi-supplier pricelist schema and sync purchase/shipping from assigned lists.
 *
 *   npm run db:migrate-supplier-pricelist-pages
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { ensureEnvLoaded } from '../src/lib/ensure-env'
import { queryDb } from '../src/lib/db'
import {
  syncAllCuratedPricelistPurchasePrices,
  syncAllCuratedPricelistShippingCosts,
} from '../src/lib/pricelist-db'

async function runSqlStatements(sql: string): Promise<void> {
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--') && !/^USE /i.test(s))

  for (const statement of statements) {
    try {
      await queryDb(statement)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.includes('Duplicate') ||
        msg.includes('already exists') ||
        msg.includes('check that column/key exists')
      ) {
        console.warn(`Skipped (already applied): ${statement.slice(0, 80)}…`)
        continue
      }
      throw err
    }
  }
}

async function main() {
  ensureEnvLoaded()
  const sqlPath = join(process.cwd(), 'db', 'supplier_pricelist_pages.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  console.log('Applying supplier pricelist pages migration…')
  await runSqlStatements(sql)

  const purchase = await syncAllCuratedPricelistPurchasePrices()
  console.log(`Synced purchase_price for ${purchase.updated} product(s).`)

  const shipping = await syncAllCuratedPricelistShippingCosts()
  console.log(
    `Synced shipping_cost for ${shipping.updated} product(s) (${shipping.onPricelist} on curated lists).`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
