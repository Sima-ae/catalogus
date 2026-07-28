#!/usr/bin/env npx tsx
/**
 * Mark products sold out when the supplier album/page is gone
 * (Yupoo “该相册已不存在” / placeholder images, HTTP 404, empty galleries).
 *
 * Sold-out products are hidden from the shop catalog.
 *
 *   npx tsx scripts/mark-unavailable-source-products.ts --dry-run
 *   npx tsx scripts/mark-unavailable-source-products.ts --limit=200
 *   npx tsx scripts/mark-unavailable-source-products.ts --apply --limit=500
 */
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { resetDbPool } from '@/lib/db'
import {
  applyUnavailableSourceSoldOut,
  scanUnavailableSourceProducts,
} from '@/lib/scan-unavailable-sources'

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

function parseArgInt(name: string, fallback: number): number {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`))
  if (!arg) return fallback
  const n = Number(arg.slice(name.length + 1))
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

async function main() {
  loadDotEnv()
  const apply = hasFlag('--apply')
  const dryRun = !apply || hasFlag('--dry-run')
  const limit = parseArgInt('--limit', 300)
  const concurrency = Math.min(4, parseArgInt('--concurrency', 2))
  const delayMs = parseArgInt('--delay-ms', 800)

  console.log(
    `[mark-unavailable] ${dryRun ? 'DRY-RUN' : 'APPLY'} limit=${limit} concurrency=${concurrency}`
  )

  const result = await scanUnavailableSourceProducts({
    limit,
    concurrency,
    delayMs,
    rotateChecked: true,
  })

  console.log(
    `[mark-unavailable] checked=${result.scanned} ok=${result.ok} unavailable=${result.candidates.length} password_gate=${result.passwordGate} errors=${result.errors}`
  )

  if (!result.candidates.length) {
    await resetDbPool()
    return
  }

  for (const row of result.candidates.slice(0, 30)) {
    console.log(`  - ${row.id} ${row.reason} ${row.source_url}`)
  }
  if (result.candidates.length > 30) {
    console.log(`  … +${result.candidates.length - 30} more`)
  }

  if (dryRun) {
    console.log('[mark-unavailable] dry-run only — pass --apply to mark sold_out')
    await resetDbPool()
    return
  }

  const marked = await applyUnavailableSourceSoldOut(
    result.candidates.map((r) => r.id)
  )
  console.log(`[mark-unavailable] marked sold_out=${marked.marked}`)
  await resetDbPool()
}

main().catch(async (err) => {
  console.error(err)
  try {
    await resetDbPool()
  } catch {
    // ignore
  }
  process.exit(1)
})
