#!/usr/bin/env npx tsx
/**
 * Re-apply conservative description cleanup to all products (fixes over-stripped text).
 *
 *   npm run db:reapply-descriptions
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { queryDb, resetDbPool } from '@/lib/db'
import {
  catalogCardDescription,
  cleanImportDescription,
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

type Row = {
  id: string
  name: string
  description: string | null
  short_description: string | null
  brand: string | null
}

async function main() {
  loadDotEnv()
  const dryRun = process.argv.includes('--dry-run')

  const rows = await queryDb<Row[]>(
    `SELECT id, name, description, short_description, brand FROM products`
  )

  let updated = 0
  for (const row of rows) {
    const name = String(row.name ?? '').trim()
    const brand = row.brand?.trim() || null
    const raw = String(row.description ?? '').trim()
    if (!raw) continue

    const description = cleanImportDescription(raw, name, brand)
    const short_description =
      catalogCardDescription(name, description, undefined, brand).slice(0, 280) || null

    if (description === raw && (short_description ?? '') === String(row.short_description ?? '').trim()) {
      continue
    }

    updated++
    if (dryRun && updated <= 5) {
      console.log(`- ${row.id}`)
      console.log(`  before: ${raw.slice(0, 90)}`)
      console.log(`  after:  ${description.slice(0, 90) || '(empty)'}`)
    }

    if (!dryRun) {
      await queryDb(`UPDATE products SET description = ?, short_description = ? WHERE id = ?`, [
        description,
        short_description,
        row.id,
      ])
      if (updated % 1000 === 0) console.log(`Updated ${updated}…`)
    }
  }

  const [{ empty }] = await queryDb<{ empty: number }[]>(
    `SELECT COUNT(*) AS empty FROM products WHERE TRIM(COALESCE(description, '')) = ''`
  )
  const [{ chinese }] = await queryDb<{ chinese: number }[]>(
    `SELECT COUNT(*) AS chinese FROM products WHERE description REGEXP '[\\u4e00-\\u9fff]'`
  )

  console.log(
    dryRun ? `\nDry run: ${updated} would change.` : `\nUpdated ${updated} products.`
  )
  console.log(`Empty descriptions: ${empty}`)
  console.log(`Descriptions still containing Chinese: ${chinese}`)
}

main()
  .finally(() => resetDbPool().catch(() => {}))
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
