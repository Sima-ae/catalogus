import { queryDb } from '@/lib/db'
import { fetchHtmlResult, sleep } from '@/lib/yupoo/client'
import {
  createYupooFetchContext,
  isYupooPasswordGateHtml,
  yupooOrigin,
  type YupooFetchContext,
} from '@/lib/yupoo/session'
import { parseAlbumPage } from '@/lib/yupoo/parse-album'
import {
  classifySourcePageAvailability,
  isYupooUnavailableAlbumHtml,
} from '@/lib/yupoo/unavailable'
import { markProductsSoldOutUnavailable } from '@/lib/mark-source-unavailable'

export type UnavailableSourceCandidate = {
  id: string
  name: string
  sku: string | null
  image_url: string | null
  source_url: string
  brand: string | null
  reason: string
}

export type UnavailableSourceScanResult = {
  scanned: number
  ok: number
  passwordGate: number
  errors: number
  limit: number
  candidates: UnavailableSourceCandidate[]
}

export type UnavailableSourceScanOptions = {
  limit?: number
  concurrency?: number
  delayMs?: number
  /** Bump updated_at on still-available products so the next batch rotates. */
  rotateChecked?: boolean
}

type Row = {
  id: string
  name: string
  sku: string | null
  image_url: string | null
  source_url: string
  brand: string | null
}

type FetchCtx = Pick<YupooFetchContext, 'fetchHtml' | 'fetchHtmlResult'>

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
  let fetchPage = (u: string) => fetchHtmlResult(u)

  if (password && origin) {
    let ctx = ctxCache.get(origin)
    if (!ctx) {
      ctx = await createYupooFetchContext(origin, password)
      ctxCache.set(origin, ctx)
    }
    fetchPage = ctx.fetchHtmlResult
  }

  try {
    const { status, html } = await fetchPage(url)
    return {
      status,
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

/**
 * Dry-run scan: find active in-stock products whose supplier/Yupoo page is gone.
 * Does not mark sold out — caller must approve via markProductsSoldOutUnavailable.
 */
export async function scanUnavailableSourceProducts(
  options: UnavailableSourceScanOptions = {}
): Promise<UnavailableSourceScanResult> {
  const limit = Math.min(500, Math.max(1, Math.floor(options.limit ?? 80)))
  const concurrency = Math.min(4, Math.max(1, Math.floor(options.concurrency ?? 2)))
  const delayMs = Math.min(2000, Math.max(0, Math.floor(options.delayMs ?? 500)))
  const rotateChecked = options.rotateChecked !== false

  const rows = await queryDb<Row[]>(
    `SELECT id, name, sku, image_url, source_url, brand
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

  const passwords = await loadPasswordByOrigin()
  const ctxCache = new Map<string, FetchCtx>()
  const candidates: UnavailableSourceCandidate[] = []
  const okIds: string[] = []
  let scanned = 0
  let ok = 0
  let passwordGate = 0
  let errors = 0

  let cursor = 0
  async function worker() {
    while (cursor < rows.length) {
      const idx = cursor++
      const row = rows[idx]!
      scanned++
      try {
        const { status, html, passwordGate: gated } = await fetchAlbumHtml(
          row.source_url,
          passwords,
          ctxCache
        )
        if (gated) {
          passwordGate++
          await sleep(delayMs)
          continue
        }

        let imageCount: number | null = null
        if (html && /yupoo\.com/i.test(row.source_url)) {
          try {
            const albumId =
              row.source_url.match(/\/albums\/(\d+)/i)?.[1] || row.id
            imageCount = parseAlbumPage(html, row.source_url, albumId).images.length
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

        let reason: string | null = null
        if (
          verdict.ok &&
          html &&
          /yupoo\.com/i.test(row.source_url) &&
          isYupooUnavailableAlbumHtml(html)
        ) {
          reason = 'yupoo_album_not_found'
        } else if (!verdict.ok) {
          reason = verdict.reason
        }

        if (reason) {
          candidates.push({
            id: row.id,
            name: row.name,
            sku: row.sku,
            image_url: row.image_url,
            source_url: row.source_url,
            brand: row.brand,
            reason,
          })
        } else {
          ok++
          okIds.push(row.id)
        }
      } catch {
        errors++
      }
      await sleep(delayMs)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))

  if (rotateChecked && okIds.length) {
    const placeholders = okIds.map(() => '?').join(', ')
    try {
      await queryDb(
        `UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        okIds
      )
    } catch {
      // rotation is best-effort
    }
  }

  return {
    scanned,
    ok,
    passwordGate,
    errors,
    limit,
    candidates,
  }
}

export async function applyUnavailableSourceSoldOut(
  productIds: string[]
): Promise<{ marked: number; ids: string[] }> {
  const ids = Array.from(
    new Set(productIds.map((id) => String(id || '').trim()).filter(Boolean))
  )
  if (!ids.length) return { marked: 0, ids: [] }
  return markProductsSoldOutUnavailable(ids, 'admin_unavailable_scan')
}
