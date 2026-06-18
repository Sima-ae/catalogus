#!/usr/bin/env npx tsx
/**
 * One-time: mark all inactive/draft products on a pricelist as Uitverkocht.
 *
 *   npm run db:sync-inactive-pricelist-stock
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { resetDbPool } from '@/lib/db'
import { markPricelistOutOfStockForAllHiddenCatalogProducts } from '@/lib/pricelist-catalog-status-sync'

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

async function main() {
  loadDotEnv()
  const result = await markPricelistOutOfStockForAllHiddenCatalogProducts()
  console.log(
    `Synced ${result.productCount} inactive/draft products on pricelist (${result.updated} price rows updated, ${result.inserted} inserted).`
  )
  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
