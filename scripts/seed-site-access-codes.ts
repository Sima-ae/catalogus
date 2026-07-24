#!/usr/bin/env npx tsx
/**
 * Seed personal site-access codes from db/site_access_codes_seed.txt
 *
 *   npm run db:seed-site-access-codes
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { insertSiteAccessCode, countSiteAccessCodes } from '@/lib/site-access-codes-db'

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
  const seedPath = resolve(process.cwd(), 'db/site_access_codes_seed.txt')
  if (!existsSync(seedPath)) {
    console.error('Missing seed file:', seedPath)
    console.error(
      'Copy db/site_access_codes_seed.example.txt → db/site_access_codes_seed.txt and fill real codes (file is gitignored).'
    )
    process.exit(1)
  }

  const lines = readFileSync(seedPath, 'utf8').split(/\r?\n/)
  let inserted = 0
  let skipped = 0
  let invalid = 0

  for (const line of lines) {
    const raw = line.trim()
    if (!raw || raw.startsWith('#')) continue
    const result = await insertSiteAccessCode(raw)
    if (result === 'inserted') inserted++
    else {
      const normalized = raw.replace(/\D/g, '')
      if (!normalized) invalid++
      else skipped++
    }
  }

  const stats = await countSiteAccessCodes()
  console.log('Seed complete.')
  console.log(`  inserted: ${inserted}`)
  console.log(`  skipped (duplicate/empty): ${skipped}`)
  if (invalid) console.log(`  invalid lines: ${invalid}`)
  console.log(`  pool total: ${stats.total} (${stats.available} available, ${stats.assigned} assigned)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
