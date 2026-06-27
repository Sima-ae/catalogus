import { queryDb } from '@/lib/db'
import { getCachedValue } from '@/lib/server-ttl-cache'
import type { Locale } from '@/lib/i18n-locale-registry'
import {
  hasAnyTickerText,
  normalizeTickerTranslations,
  parseTickerTranslations,
  resolveTickerLine,
  type TickerMessagePublic,
  type TickerTranslations,
} from '@/lib/site-ticker'

export type SiteTickerMessageRow = {
  id: number
  sortOrder: number
  isActive: boolean
  translations: TickerTranslations
  createdAt: string
  updatedAt: string
}

const TICKER_CACHE_NS = 'site-ticker-messages'
const TICKER_CACHE_TTL_MS = 15_000

type DbRow = {
  id: number
  sort_order: number
  is_active: number | boolean
  translations: unknown
  created_at: string | Date
  updated_at: string | Date
}

function rowToMessage(row: DbRow): SiteTickerMessageRow {
  return {
    id: row.id,
    sortOrder: row.sort_order,
    isActive: row.is_active === true || row.is_active === 1,
    translations: parseTickerTranslations(row.translations),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function listAllSiteTickerMessages(): Promise<SiteTickerMessageRow[]> {
  const rows = await queryDb<DbRow[]>(
    `SELECT id, sort_order, is_active, translations, created_at, updated_at
     FROM site_ticker_messages
     ORDER BY sort_order ASC, id ASC`
  )
  return rows.map(rowToMessage)
}

export async function listActiveSiteTickerMessagesForLocale(
  locale: Locale
): Promise<TickerMessagePublic[]> {
  return getCachedValue(TICKER_CACHE_NS, locale, TICKER_CACHE_TTL_MS, async () => {
    const rows = await queryDb<DbRow[]>(
      `SELECT id, sort_order, translations
       FROM site_ticker_messages
       WHERE is_active = 1
       ORDER BY sort_order ASC, id ASC`
    )
    return rows
      .map((row) => {
        const translations = parseTickerTranslations(row.translations)
        const text = resolveTickerLine(translations, locale)
        return text ? { id: row.id, sortOrder: row.sort_order, text } : null
      })
      .filter((m): m is TickerMessagePublic => m != null)
  })
}

export async function createSiteTickerMessage(input: {
  translations: TickerTranslations
  isActive?: boolean
  sortOrder?: number | null
}): Promise<SiteTickerMessageRow> {
  const translations = normalizeTickerTranslations(input.translations)
  if (!hasAnyTickerText(translations)) {
    throw new Error('At least one translation is required')
  }

  const maxRows = await queryDb<{ max_sort: number | null }[]>(
    'SELECT MAX(sort_order) AS max_sort FROM site_ticker_messages'
  )
  const maxSort = maxRows[0]?.max_sort ?? -1
  let sortOrder = maxSort + 1
  if (typeof input.sortOrder === 'number' && Number.isFinite(input.sortOrder)) {
    sortOrder = Math.max(0, Math.min(1_000_000, Math.floor(input.sortOrder)))
  }

  const isActive = input.isActive === false ? 0 : 1
  await queryDb(
    `INSERT INTO site_ticker_messages (sort_order, is_active, translations)
     VALUES (?, ?, ?)`,
    [sortOrder, isActive, JSON.stringify(translations)]
  )
  const rows = await queryDb<DbRow[]>(
    `SELECT id, sort_order, is_active, translations, created_at, updated_at
     FROM site_ticker_messages WHERE id = LAST_INSERT_ID() LIMIT 1`
  )
  const row = rows[0]
  if (!row) throw new Error('Failed to load created ticker message')
  return rowToMessage(row)
}

export async function updateSiteTickerMessage(
  id: number,
  patch: {
    translations?: TickerTranslations
    isActive?: boolean
    sortOrder?: number
  }
): Promise<SiteTickerMessageRow | null> {
  const sets: string[] = []
  const params: unknown[] = []

  if (patch.translations !== undefined) {
    const translations = normalizeTickerTranslations(patch.translations)
    if (!hasAnyTickerText(translations)) {
      throw new Error('At least one translation is required')
    }
    sets.push('translations = ?')
    params.push(JSON.stringify(translations))
  }
  if (patch.isActive !== undefined) {
    sets.push('is_active = ?')
    params.push(patch.isActive ? 1 : 0)
  }
  if (patch.sortOrder !== undefined) {
    const sortOrder = Math.max(0, Math.min(1_000_000, Math.floor(patch.sortOrder)))
    sets.push('sort_order = ?')
    params.push(sortOrder)
  }

  if (!sets.length) return getSiteTickerMessageById(id)

  params.push(id)
  await queryDb(`UPDATE site_ticker_messages SET ${sets.join(', ')} WHERE id = ?`, params)
  return getSiteTickerMessageById(id)
}

export async function deleteSiteTickerMessage(id: number): Promise<boolean> {
  const before = await getSiteTickerMessageById(id)
  if (!before) return false
  await queryDb('DELETE FROM site_ticker_messages WHERE id = ?', [id])
  return true
}

export async function getSiteTickerMessageById(id: number): Promise<SiteTickerMessageRow | null> {
  const rows = await queryDb<DbRow[]>(
    `SELECT id, sort_order, is_active, translations, created_at, updated_at
     FROM site_ticker_messages WHERE id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ? rowToMessage(rows[0]) : null
}
