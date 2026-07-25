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
import { queryDb, resetDbPool } from '@/lib/db'
import { fetchHtml, sleep } from '@/lib/yupoo/client'
import {
  createYupooFetchContext,
  isYupooPasswordGateHtml,
  yupooOrigin,
} from '@/lib/yupoo/session'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import {
  classifySourcePageAvailability,
  isYupooUnavailableAlbumHtml,
} from '@/lib/yupoo/unavailable'
import { markProductsSoldOutUnavailable } from '@/lib/mark-source-unavailable'

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

type Row = {
  id: string
  source_url: string
  image_url: string | null
}

type FetchCtx = {
  fetchHtml: (url: string) => Promise<string>
}

async function loadPasswordByOrigin(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const rows = await queryDb<{ store_url: string | null; yupoo_access_password: string | null }[]>(
      `SELECT store_url, yupoo_access_password FROM import_sources
       WHERE yupoo_access_password IS NOT NULL AND TRIM(yupoo_access_password) <> ''`
    )
    for (const row of rows) {
      const url = String(row.store_url || '').trim()
      const pw = String(row.yupoo_access_password || '').trim()
      if (!url || !pw) continue
      try {
        map.set(yupooOrigin(url), pw)
      } catch {
        // ignore bad store urls
      }
    }
  } catch {
    // import_sources may be missing columns locally
  }
  return map
}

async function fetchAlbumHtml(
  url: string,
  passwords: Map<string, string>,
  ctxCache: Map<string, FetchCtx>
): Promise<{ status: number; html: string; passwordGate: boolean }> {
  let origin = ''
  try {
    origin = yupooOrigin(url)
  } catch {
    origin = ''
  }

  const password = origin ? passwords.get(origin) : undefined
  let fetchPage = (u: string) => fetchHtml(u)

  if (password && origin) {
    let ctx = ctxCache.get(origin)
    if (!ctx) {
      ctx = await createYupooFetchContext(origin, password)
      ctxCache.set(origin, ctx)
    }
    fetchPage = ctx.fetchHtml
  }

  try {
    const html = await fetchPage(url)
    return {
      status: 200,
      html,
      passwordGate: isYupooPasswordGateHtml(html),
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const m = message.match(/HTTP\s+(\d+)/i)
    const status = m ? Number(m[1]) : 0
    return { status: status || 500, html: '', passwordGate: false }
  }
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

  const rows = await queryDb<Row[]>(
    `SELECT id, source_url, image_url
     FROM products
     WHERE status = 'active'
       AND COALESCE(sold_out, 0) = 0
       AND source_url IS NOT NULL
       AND TRIM(source_url) <> ''
       AND (
         source_url LIKE '%yupoo.com%'
         OR source_url LIKE '%wecatalog%'
         OR source_url LIKE '%lkxox%'
         OR source_url LIKE '%facebook.com%'
         OR source_url LIKE '%fb.watch%'
       )
     ORDER BY updated_at ASC
     LIMIT ?`,
    [limit]
  )

  console.log(`[mark-unavailable] checking ${rows.length} product(s)`)

  const passwords = await loadPasswordByOrigin()
  const ctxCache = new Map<string, FetchCtx>()
  const toMark: { id: string; reason: string; url: string }[] = []
  let checked = 0
  let skippedGate = 0
  let ok = 0
  let errors = 0

  let cursor = 0
  async function worker() {
    while (cursor < rows.length) {
      const idx = cursor++
      const row = rows[idx]!
      checked++
      try {
        const { status, html, passwordGate } = await fetchAlbumHtml(
          row.source_url,
          passwords,
          ctxCache
        )
        if (passwordGate) {
          skippedGate++
          await sleep(delayMs)
          continue
        }

        let imageCount: number | null = null
        if (html && /yupoo\.com/i.test(row.source_url)) {
          try {
            const albumId =
              row.source_url.match(/\/albums\/(\d+)/i)?.[1] ||
              row.id
            const album = parseAlbumPage(html, row.source_url, albumId)
            imageCount = album.images.length
          } catch {
            imageCount = null
          }
        }

        const verdict = classifySourcePageAvailability({
          status,
          html,
          imageCount,
          hostHint: row.source_url,
        })

        // Extra Yupoo HTML check when fetch returned 200 but page is the 404 shell
        if (
          verdict.ok &&
          html &&
          /yupoo\.com/i.test(row.source_url) &&
          isYupooUnavailableAlbumHtml(html)
        ) {
          toMark.push({ id: row.id, reason: 'yupoo_album_not_found', url: row.source_url })
        } else if (!verdict.ok) {
          toMark.push({ id: row.id, reason: verdict.reason, url: row.source_url })
        } else {
          ok++
        }
      } catch (err) {
        errors++
        console.warn(`[mark-unavailable] error ${row.id}:`, err)
      }
      await sleep(delayMs)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  console.log(
    `[mark-unavailable] checked=${checked} ok=${ok} unavailable=${toMark.length} password_gate=${skippedGate} errors=${errors}`
  )

  if (!toMark.length) {
    await resetDbPool()
    return
  }

  for (const row of toMark.slice(0, 30)) {
    console.log(`  - ${row.id} ${row.reason} ${row.url}`)
  }
  if (toMark.length > 30) console.log(`  … +${toMark.length - 30} more`)

  if (dryRun) {
    console.log('[mark-unavailable] dry-run only — pass --apply to mark sold_out')
    await resetDbPool()
    return
  }

  const result = await markProductsSoldOutUnavailable(
    toMark.map((r) => r.id),
    'source_scan'
  )
  console.log(`[mark-unavailable] marked sold_out=${result.marked}`)
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
