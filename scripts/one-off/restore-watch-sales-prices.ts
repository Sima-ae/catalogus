/**
 * Restore missing sales prices on superclones.cloud (catalogus) watches.
 *
 * DEPRECATED for Horloges: platform/supplier pricelist unit_price is purchase
 * (inkoop), not sales. Using it as products.price caused sales==purchase.
 * Prefer: npm run db:fix-watch-sales-from-margin
 *
 * Accidental clears (e.g. clear-imported-sales-prices) should have targeted
 * watches/jos only — this puts catalogus Horloges prices back.
 *
 * Fill sources (first hit wins per product):
 *   1. Local seller_product_prices (platform pricelist unit_price > 0) — COST, not sales
 *   2. watches DB (repl_watch) — match by SKU / id / source_url
 *   3. jos DB (jos_watch) — same matching
 *
 * Only fills products where products.price is missing/0 (unless --force).
 * Default scope: Horloges category (~1472). Use --all-zero for every zero-price product.
 *
 * Requires DB tunnel: npm run db:tunnel
 *
 *   npx tsx scripts/one-off/restore-watch-sales-prices.ts --dry-run
 *   npx tsx scripts/one-off/restore-watch-sales-prices.ts
 *   npx tsx scripts/one-off/restore-watch-sales-prices.ts --force
 *   npx tsx scripts/one-off/restore-watch-sales-prices.ts --all-zero
 *   npx tsx scripts/one-off/restore-watch-sales-prices.ts --skip-remote
 */
import { createConnection, type Connection, type RowDataPacket } from 'mysql2/promise'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import {
  parseProductOptions,
  type ProductOptions,
} from '../../src/lib/product-options'
import { PLATFORM_PRICELIST_OWNER_ID } from '../../src/lib/pricelist-constants'

type ProductRow = {
  id: string
  name: string
  sku: string
  source_url: string | null
  category: string | null
  category_name: string | null
  price: number
  original_price: number | null
  purchase_price: number | null
  shipping_cost: number | null
  product_options: string | null
  status: string
}

type PriceSource = {
  price: number
  original_price: number | null
  product_options: string | null
  label: string
}

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

function loadDotEnvFile(filePath: string) {
  for (const [key, val] of Object.entries(readEnvFile(filePath))) {
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run')
  const force = process.argv.includes('--force')
  const allZero = process.argv.includes('--all-zero')
  const skipRemote = process.argv.includes('--skip-remote')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const categoryArg = process.argv.find((a) => a.startsWith('--category='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined
  const category = categoryArg
    ? categoryArg.split('=').slice(1).join('=').trim()
    : 'HORLOGES'
  return {
    dryRun,
    force,
    allZero,
    skipRemote,
    category: category || 'HORLOGES',
    limit: Number.isFinite(limit) ? limit : undefined,
  }
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function isMissing(value: number | null | undefined, force: boolean): boolean {
  if (force) return true
  return value == null || !Number.isFinite(value) || value <= 0
}

function hasPositive(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value) && value > 0
}

function skuKey(sku: string | null | undefined): string {
  return String(sku ?? '')
    .trim()
    .toLowerCase()
}

function skuAliases(sku: string | null | undefined): string[] {
  const raw = skuKey(sku)
  if (!raw) return []
  const aliases = new Set<string>([raw])
  const stripped = raw.replace(/^wc[-_]?/i, '')
  if (stripped && stripped !== raw) aliases.add(stripped)
  return Array.from(aliases)
}

function sourceKey(url: string | null | undefined): string {
  return String(url ?? '')
    .trim()
    .toLowerCase()
    .replace(/\/+$/, '')
}

function isWatchCategory(row: ProductRow, categoryNeedle: string): boolean {
  const needle = categoryNeedle.trim().toLowerCase()
  if (!needle || needle === 'all') return true
  const hay = `${row.category_name ?? ''} ${row.category ?? ''}`.toLowerCase()
  if (needle === 'horloges' || needle === 'watches') {
    return (
      hay.includes('horloge') ||
      hay.includes('watch') ||
      hay.includes('uhren') ||
      hay.includes('montre')
    )
  }
  return hay.includes(needle)
}

function optionValueKey(
  groupSlug: string | undefined,
  groupName: string,
  value: { slug?: string; label: string }
): string {
  const g = (groupSlug || groupName).trim().toLowerCase()
  const v = (value.slug || value.label).trim().toLowerCase()
  return `${g}::${v}`
}

function mergeOptionSalesPrices(
  targetOpts: ProductOptions | null,
  sourceOpts: ProductOptions | null,
  force: boolean
): { next: ProductOptions | null; changed: boolean } {
  if (!sourceOpts?.length || !targetOpts?.length) {
    return { next: targetOpts, changed: false }
  }

  const srcMap = new Map<
    string,
    { price: number; original_price: number | null }
  >()
  for (const g of sourceOpts) {
    for (const v of g.values) {
      srcMap.set(optionValueKey(g.slug, g.name, v), {
        price: v.price,
        original_price: v.original_price ?? null,
      })
    }
  }

  let changed = false
  const next: ProductOptions = targetOpts.map((group) => ({
    ...group,
    values: group.values.map((v) => {
      const src = srcMap.get(optionValueKey(group.slug, group.name, v))
      if (!src) return v
      const updated = { ...v }
      if (isMissing(updated.price, force) && hasPositive(src.price)) {
        updated.price = src.price
        changed = true
      }
      if (
        isMissing(updated.original_price, force) &&
        hasPositive(src.original_price)
      ) {
        updated.original_price = src.original_price
        changed = true
      }
      return updated
    }),
  }))

  return { next: changed ? next : targetOpts, changed }
}

async function createDbConn(url: string, label: string): Promise<Connection> {
  const normalized = url.replace(/^mariadb:\/\//, 'mysql://')
  const conn = await createConnection({
    uri: normalized,
    multipleStatements: false,
    connectTimeout: 20000,
  })
  console.log(`OK: connected to ${label}`)
  return conn
}

function resolveUrl(
  envKey: string,
  fallbackPaths: string[],
  label: string
): string | null {
  const fromEnv = process.env[envKey]?.trim()
  if (fromEnv) return fromEnv
  for (const p of fallbackPaths) {
    const env = readEnvFile(p)
    if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim()
  }
  console.warn(`WARN: no DATABASE_URL for ${label} — skipping that source`)
  return null
}

async function loadProducts(conn: Connection, label: string): Promise<ProductRow[]> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.sku, p.source_url, p.category, c.name AS category_name,
            p.price, p.original_price, p.purchase_price, p.shipping_cost,
            p.product_options, p.status
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id`
  )
  console.log(`${label}: ${rows.length} product(s)`)
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name ?? ''),
    sku: String(r.sku ?? ''),
    source_url: r.source_url != null ? String(r.source_url) : null,
    category: r.category != null ? String(r.category) : null,
    category_name: r.category_name != null ? String(r.category_name) : null,
    price: Number(r.price) || 0,
    original_price: num(r.original_price),
    purchase_price: num(r.purchase_price),
    shipping_cost: num(r.shipping_cost),
    product_options: r.product_options != null ? String(r.product_options) : null,
    status: String(r.status ?? ''),
  }))
}

function indexProducts(products: ProductRow[]) {
  const bySku = new Map<string, ProductRow>()
  const byId = new Map<string, ProductRow>()
  const bySource = new Map<string, ProductRow>()
  for (const p of products) {
    byId.set(p.id, p)
    for (const alias of skuAliases(p.sku)) {
      if (!bySku.has(alias)) bySku.set(alias, p)
    }
    const src = sourceKey(p.source_url)
    if (src && !bySource.has(src)) bySource.set(src, p)
  }
  return { bySku, byId, bySource }
}

function findMatch(
  target: ProductRow,
  index: ReturnType<typeof indexProducts>
): ProductRow | null {
  for (const alias of skuAliases(target.sku)) {
    if (index.bySku.has(alias)) return index.bySku.get(alias)!
  }
  if (index.byId.has(target.id)) return index.byId.get(target.id)!
  const src = sourceKey(target.source_url)
  if (src && index.bySource.has(src)) return index.bySource.get(src)!
  return null
}

async function loadPricelistSalesPrices(
  conn: Connection
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT product_id, unit_price
       FROM seller_product_prices
       WHERE list_owner_id = ?
         AND COALESCE(unit_price, 0) > 0`,
      [PLATFORM_PRICELIST_OWNER_ID]
    )
    for (const r of rows) {
      const id = String(r.product_id)
      const price = Number(r.unit_price)
      if (id && Number.isFinite(price) && price > 0 && !map.has(id)) {
        map.set(id, price)
      }
    }
    console.log(`pricelist: ${map.size} product(s) with unit_price > 0`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`WARN: could not read seller_product_prices (${message})`)
  }
  return map
}

async function main() {
  const root = process.cwd()
  loadDotEnvFile(path.join(root, '.env'))
  loadDotEnvFile(path.join(root, '../watches/.env'))
  loadDotEnvFile(path.join(root, '../jos/.env'))

  const args = parseArgs()
  const catalogUrl = resolveUrl(
    'DATABASE_URL',
    [path.join(root, '.env')],
    'catalogus'
  )
  if (!catalogUrl) {
    throw new Error('Set DATABASE_URL for supe_r_clones_cloud (catalogus)')
  }

  const watchesUrl = args.skipRemote
    ? null
    : resolveUrl(
        'WATCHES_DATABASE_URL',
        [path.join(root, '../watches/.env')],
        'watches'
      )
  const josUrl = args.skipRemote
    ? null
    : resolveUrl(
        'JOS_DATABASE_URL',
        [path.join(root, '../jos/.env')],
        'jos'
      )

  if (watchesUrl && watchesUrl === catalogUrl) {
    throw new Error('WATCHES and catalogus DATABASE_URL are the same — aborting')
  }
  if (josUrl && josUrl === catalogUrl) {
    throw new Error('JOS and catalogus DATABASE_URL are the same — aborting')
  }

  const catalogConn = await createDbConn(catalogUrl, 'supe_r_clones_cloud (target)')
  let watchesConn: Connection | null = null
  let josConn: Connection | null = null

  try {
    const pricelistPrices = await loadPricelistSalesPrices(catalogConn)
    let targets = await loadProducts(catalogConn, 'catalogus')
    targets = targets.filter((p) => p.status !== 'trash')
    if (!args.allZero) {
      targets = targets.filter((p) => isWatchCategory(p, args.category))
    }
    targets = targets.filter((p) => isMissing(p.price, args.force))
    if (args.limit) targets = targets.slice(0, args.limit)

    console.log(
      `Targets: ${targets.length} product(s)` +
        (args.allZero
          ? ' (all zero/missing sales price)'
          : ` in category ~${args.category}`)
    )

    let watchesIndex: ReturnType<typeof indexProducts> | null = null
    let josIndex: ReturnType<typeof indexProducts> | null = null

    if (watchesUrl) {
      try {
        watchesConn = await createDbConn(watchesUrl, 'repl_watch (source)')
        watchesIndex = indexProducts(await loadProducts(watchesConn, 'watches'))
      } catch (err) {
        console.warn(
          `WARN: watches source unavailable — ${err instanceof Error ? err.message : err}`
        )
      }
    }
    if (josUrl) {
      try {
        josConn = await createDbConn(josUrl, 'jos_watch (source)')
        josIndex = indexProducts(await loadProducts(josConn, 'jos'))
      } catch (err) {
        console.warn(
          `WARN: jos source unavailable — ${err instanceof Error ? err.message : err}`
        )
      }
    }

    let updated = 0
    let wouldUpdate = 0
    let unmatched = 0
    let fromPricelist = 0
    let fromWatches = 0
    let fromJos = 0
    let optionFills = 0
    const samples: string[] = []

    for (const t of targets) {
      let source: PriceSource | null = null

      const listPrice = pricelistPrices.get(t.id)
      if (hasPositive(listPrice)) {
        source = {
          price: listPrice!,
          original_price: null,
          product_options: null,
          label: 'pricelist',
        }
      }

      if (!source && watchesIndex) {
        const m = findMatch(t, watchesIndex)
        if (m && hasPositive(m.price)) {
          source = {
            price: m.price,
            original_price: m.original_price,
            product_options: m.product_options,
            label: 'watches',
          }
        }
      }

      if (!source && josIndex) {
        const m = findMatch(t, josIndex)
        if (m && hasPositive(m.price)) {
          source = {
            price: m.price,
            original_price: m.original_price,
            product_options: m.product_options,
            label: 'jos',
          }
        }
      }

      if (!source) {
        unmatched++
        continue
      }

      let nextPrice = t.price
      let nextOriginal = t.original_price
      let changed = false

      if (isMissing(t.price, args.force) && hasPositive(source.price)) {
        nextPrice = source.price
        changed = true
        if (source.label === 'pricelist') fromPricelist++
        else if (source.label === 'watches') fromWatches++
        else fromJos++
      }
      if (
        isMissing(t.original_price, args.force) &&
        hasPositive(source.original_price)
      ) {
        nextOriginal = source.original_price
        changed = true
      }

      const targetOpts = parseProductOptions(t.product_options)
      const sourceOpts = parseProductOptions(source.product_options)
      const merged = mergeOptionSalesPrices(targetOpts, sourceOpts, args.force)
      if (merged.changed) {
        changed = true
        optionFills++
      }

      if (!changed) continue

      if (samples.length < 15) {
        samples.push(
          `${t.sku || t.id} | ${t.name.slice(0, 42)} | ` +
            `${t.price}→${nextPrice} via ${source.label}` +
            (merged.changed ? ' +options' : '')
        )
      }

      if (args.dryRun) {
        wouldUpdate++
        continue
      }

      await catalogConn.query(
        `UPDATE products
         SET price = ?, original_price = ?, product_options = ?
         WHERE id = ?`,
        [
          nextPrice,
          nextOriginal,
          merged.changed && merged.next
            ? JSON.stringify(merged.next)
            : t.product_options,
          t.id,
        ]
      )
      updated++
    }

    console.log('')
    console.log('=== Summary ===')
    console.log(`Mode: ${args.dryRun ? 'DRY-RUN' : 'APPLY'}${args.force ? ' (force)' : ''}`)
    console.log(`Targets scanned: ${targets.length}`)
    console.log(`No usable source: ${unmatched}`)
    console.log(
      `${args.dryRun ? 'Would update' : 'Updated'}: ${args.dryRun ? wouldUpdate : updated}`
    )
    console.log(`  from platform pricelist: ${fromPricelist}`)
    console.log(`  from watches (repl_watch): ${fromWatches}`)
    console.log(`  from jos (jos_watch): ${fromJos}`)
    console.log(`  option-tier fills: ${optionFills}`)
    if (samples.length) {
      console.log('')
      console.log('Samples:')
      for (const s of samples) console.log(`  ${s}`)
    }
    if (unmatched > 0 && !watchesIndex && !josIndex) {
      console.log('')
      console.log(
        'Tip: start the DB tunnel and re-run without --skip-remote so watches/jos can fill gaps.'
      )
    }
  } finally {
    await catalogConn.end()
    if (watchesConn) await watchesConn.end()
    if (josConn) await josConn.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
