#!/usr/bin/env npx tsx
/**
 * Remove Chinese / Japanese script from product titles and descriptions.
 *
 *   npm run db:remove-cjk-text
 *   npm run db:remove-cjk-text -- --dry-run
 *   npm run db:remove-cjk-text -- --translate   # try DeepL for titles before stripping
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import { getAllBrandNames } from '@/lib/brand-sku-prefixes'
import { polishProductTextForStorage } from '@/lib/product-brand-text'
import {
  catalogCardDescription,
  cleanImportDescription,
  containsCjkScript,
  sanitizeProductName,
  stripCjkScriptFromProductText,
} from '@/lib/yupoo/import-text'

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

type ProductRow = {
  id: string
  name: string
  description: string | null
  short_description: string | null
  brand: string | null
}

function cleanSync(row: ProductRow) {
  const rawName = String(row.name ?? '').trim()
  const brand = row.brand?.trim() || null
  const rawDescription = String(row.description ?? '').trim()
  const rawShort = String(row.short_description ?? '').trim()

  const name = sanitizeProductName(rawName)
  const description = cleanImportDescription(rawDescription, name, brand)
  const shortFromDesc =
    catalogCardDescription(name, description, undefined, brand).slice(0, 280) || ''
  const short_description = rawShort
    ? cleanImportDescription(rawShort, name, brand).slice(0, 280) || shortFromDesc || null
    : shortFromDesc || null

  return { name, description, short_description }
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')
  const translate = process.argv.includes('--translate')
  const brandNames = await getAllBrandNames()

  const rows = await queryDb<ProductRow[]>(
    `SELECT id, name, description, short_description, brand
     FROM products
     WHERE status != 'trash'`
  )

  const targets = rows.filter(
    (row) =>
      containsCjkScript(row.name) ||
      containsCjkScript(row.description) ||
      containsCjkScript(row.short_description)
  )

  let updated = 0

  for (const row of targets) {
    let name: string
    let description: string
    let short_description: string | null

    if (translate) {
      const polished = await polishProductTextForStorage({
        name: String(row.name ?? '').trim(),
        description: String(row.description ?? ''),
        short_description: row.short_description,
        brand: row.brand?.trim() || null,
        brandNames,
      })
      name = polished.name
      description = polished.description
      short_description = polished.short_description || null
    } else {
      ;({ name, description, short_description } = cleanSync(row))
    }

    name = stripCjkScriptFromProductText(name)
    description = stripCjkScriptFromProductText(description)
    short_description = short_description
      ? stripCjkScriptFromProductText(short_description).slice(0, 280) || null
      : null

    const rawName = String(row.name ?? '').trim()
    const rawDescription = String(row.description ?? '').trim()
    const rawShort = String(row.short_description ?? '').trim()

    const nameChanged = name !== rawName
    const descChanged = description !== rawDescription
    const shortChanged = (short_description ?? '') !== rawShort

    if (!nameChanged && !descChanged && !shortChanged) continue

    if (
      containsCjkScript(name) ||
      containsCjkScript(description) ||
      containsCjkScript(short_description)
    ) {
      console.warn(`[warn] ${row.id} still contains CJK after cleanup`)
    }

    updated++
    if (dryRun) {
      console.log(`[dry-run] ${row.id}`)
      if (nameChanged) console.log(`  name: ${rawName} → ${name}`)
      continue
    }

    await queryDb(
      `UPDATE products SET name = ?, description = ?, short_description = ? WHERE id = ?`,
      [name, description, short_description, row.id]
    )
  }

  console.log(
    dryRun
      ? `Dry run: ${updated} of ${targets.length} matching products would be updated (${rows.length} scanned).`
      : `Updated ${updated} of ${targets.length} matching products (${rows.length} scanned).`
  )

  await resetDbPool()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
