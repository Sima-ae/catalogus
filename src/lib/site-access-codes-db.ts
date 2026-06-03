import { randomUUID } from 'crypto'
import { queryDb } from '@/lib/db'

const CODE_PAD_LENGTH = 4

/** Normalize gate/admin input to stored form (e.g. "5" → "0005"). */
export function normalizeSiteAccessCode(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  if (digits.length > CODE_PAD_LENGTH) return digits
  return digits.padStart(CODE_PAD_LENGTH, '0')
}

export type SiteAccessCodeStats = {
  total: number
  assigned: number
  available: number
}

export async function countSiteAccessCodes(): Promise<SiteAccessCodeStats> {
  try {
    const rows = await queryDb<
      { total: number; assigned: number }[]
    >(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) AS assigned
       FROM site_access_codes`
    )
    const total = Number(rows[0]?.total ?? 0)
    const assigned = Number(rows[0]?.assigned ?? 0)
    return { total, assigned, available: Math.max(0, total - assigned) }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes("doesn't exist") || message.includes('site_access_codes')) {
      return { total: 0, assigned: 0, available: 0 }
    }
    throw error
  }
}

export async function verifySiteAccessCode(rawInput: string): Promise<boolean> {
  const code = normalizeSiteAccessCode(rawInput)
  if (!code) return false
  try {
    const rows = await queryDb<{ id: string }[]>(
      'SELECT id FROM site_access_codes WHERE code = ? LIMIT 1',
      [code]
    )
    return Boolean(rows[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes("doesn't exist") || message.includes('site_access_codes')) {
      return false
    }
    throw error
  }
}

export async function listAvailableSiteAccessCodes(limit = 500): Promise<string[]> {
  const cap = Math.min(Math.max(1, limit), 2000)
  const rows = await queryDb<{ code: string }[]>(
    `SELECT code FROM site_access_codes
     WHERE user_id IS NULL
     ORDER BY code ASC
     LIMIT ?`,
    [cap]
  )
  return rows.map((r) => r.code)
}

export async function getSiteAccessCodeForUser(userId: string): Promise<string | null> {
  try {
    const rows = await queryDb<{ code: string }[]>(
      'SELECT code FROM site_access_codes WHERE user_id = ? LIMIT 1',
      [userId]
    )
    return rows[0]?.code ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes("doesn't exist") || message.includes('site_access_codes')) {
      return null
    }
    throw error
  }
}

export async function insertSiteAccessCode(code: string): Promise<'inserted' | 'skipped'> {
  const normalized = normalizeSiteAccessCode(code)
  if (!normalized) return 'skipped'
  const result = await queryDb<{ affectedRows?: number }>(
    `INSERT IGNORE INTO site_access_codes (id, code) VALUES (?, ?)`,
    [randomUUID(), normalized]
  )
  const affected =
    typeof result === 'object' && result !== null && 'affectedRows' in result
      ? Number((result as { affectedRows: number }).affectedRows)
      : 0
  return affected > 0 ? 'inserted' : 'skipped'
}

export async function assignSiteAccessCodeToUser(input: {
  code: string
  userId: string
}): Promise<void> {
  const normalized = normalizeSiteAccessCode(input.code)
  if (!normalized) {
    throw new Error('INVALID_SITE_ACCESS_CODE')
  }

  const existingUserCode = await getSiteAccessCodeForUser(input.userId)
  if (existingUserCode) {
    throw new Error('USER_ALREADY_HAS_CODE')
  }

  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE site_access_codes
     SET user_id = ?, assigned_at = CURRENT_TIMESTAMP
     WHERE code = ? AND user_id IS NULL`,
    [input.userId, normalized]
  )
  const affected =
    typeof result === 'object' && result !== null && 'affectedRows' in result
      ? Number((result as { affectedRows: number }).affectedRows)
      : 0

  if (affected === 0) {
    const rows = await queryDb<{ user_id: string | null }[]>(
      'SELECT user_id FROM site_access_codes WHERE code = ? LIMIT 1',
      [normalized]
    )
    if (!rows[0]) throw new Error('CODE_NOT_FOUND')
    throw new Error('CODE_ALREADY_ASSIGNED')
  }
}
