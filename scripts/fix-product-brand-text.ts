#!/usr/bin/env npx tsx
/**
 * Fix obfuscated brand names and CJK in product titles/descriptions.
 *
 *   npm run db:fix-product-brand-text
 *   npm run db:fix-product-brand-text -- --dry-run
 */
import { ensureEnvLoaded } from '@/lib/ensure-env'
import { queryDb, resetDbPool } from '@/lib/db'
import { getAllBrandNames } from '@/lib/brand-sku-prefixes'
import {
  polishProductDisplayText,
  polishProductTextForStorage,
} from '@/lib/product-brand-text'
import { titleNeedsCjkCleanup } from '@/lib/yupoo/product-title'

type Row = {
  id: string
  name: string
  description: string | null
  short_description: string | null
  brand: string | null
}

async function main() {
  ensureEnvLoaded()
  const dryRun = process.argv.includes('--dry-run')
  const brandNames = await getAllBrandNames()
  const rows = await queryDb<Row[]>(
    `SELECT id, name, description, short_description, brand FROM products`
  )

  let updated = 0
  const preview: { id: string; before: string; after: string }[] = []

  for (const row of rows) {
    const brand = row.brand?.trim() || null
    const needsCjk = titleNeedsCjkCleanup(row.name)
    const syncPolished = polishProductDisplayText({
      name: row.name,
      description: row.description ?? '',
      short_description: row.short_description,
      brand,
      brandNames,
    })

    const nameChanged = syncPolished.name !== row.name.trim()
    const descChanged = syncPolished.description !== String(row.description ?? '').trim()
    const shortChanged =
      syncPolished.short_description !== String(row.short_description ?? '').trim()

    let finalName = syncPolished.name
    let finalDescription = syncPolished.description
    let finalShort = syncPolished.short_description

    if (needsCjk) {
      const stored = await polishProductTextForStorage({
        name: row.name,
        description: row.description ?? '',
        short_description: row.short_description,
        brand,
        brandNames,
      })
      finalName = stored.name
      finalDescription = stored.description
      finalShort = stored.short_description
    }

    const anyChanged =
      finalName !== row.name.trim() ||
      finalDescription !== String(row.description ?? '').trim() ||
      finalShort !== String(row.short_description ?? '').trim()

    if (!anyChanged) continue

    if (preview.length < 10) {
      preview.push({ id: row.id, before: row.name, after: finalName })
    }

    updated++
    if (dryRun) continue

    await queryDb(
      `UPDATE products SET name = ?, description = ?, short_description = ? WHERE id = ?`,
      [finalName, finalDescription || null, finalShort || null, row.id]
    )

    if (updated % 100 === 0) console.log(`Updated ${updated}…`)
  }

  console.log('\nPreview:')
  for (const p of preview) {
    console.log(`- ${p.id}`)
    console.log(`  before: ${p.before}`)
    console.log(`  after:  ${p.after}`)
  }

  console.log(
    dryRun
      ? `\nDry run: ${updated} products would be updated.`
      : `\nUpdated ${updated} products.`
  )
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
