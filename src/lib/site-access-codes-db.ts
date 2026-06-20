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

export type SiteAccessCodeRow = {
  id: string
  code: string
  user_id: string | null
}

export async function findSiteAccessCodeByInput(rawInput: string): Promise<SiteAccessCodeRow | null> {
  const code = normalizeSiteAccessCode(rawInput)
  if (!code) return null
  try {
    const rows = await queryDb<SiteAccessCodeRow[]>(
      'SELECT id, code, user_id FROM site_access_codes WHERE code = ? LIMIT 1',
      [code]
    )
    return rows[0] ?? null
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes("doesn't exist") || message.includes('site_access_codes')) {
      return null
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

/** One unassigned pool code for admin random assign (never returns the full list). */
export async function pickRandomAvailableSiteAccessCode(): Promise<string | null> {
  try {
    const rows = await queryDb<{ code: string }[]>(
      `SELECT code FROM site_access_codes
       WHERE user_id IS NULL
       ORDER BY RAND()
       LIMIT 1`
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

export type SiteAccessCodeAssignment = {
  code: string
  assignedAt: string | null
}

export async function getSiteAccessCodeForUser(userId: string): Promise<string | null> {
  const assignment = await getSiteAccessCodeAssignment(userId)
  return assignment?.code ?? null
}

export async function getSiteAccessCodeAssignment(
  userId: string
): Promise<SiteAccessCodeAssignment | null> {
  try {
    const rows = await queryDb<{ code: string; assigned_at: string | null }[]>(
      'SELECT code, assigned_at FROM site_access_codes WHERE user_id = ? LIMIT 1',
      [userId]
    )
    if (!rows[0]) return null
    return {
      code: rows[0].code,
      assignedAt: rows[0].assigned_at != null ? String(rows[0].assigned_at) : null,
    }
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

export async function unassignSiteAccessCodeFromUser(userId: string): Promise<void> {
  const existing = await getSiteAccessCodeAssignment(userId)
  if (!existing) throw new Error('USER_HAS_NO_CODE')

  const result = await queryDb<{ affectedRows?: number }>(
    `UPDATE site_access_codes
     SET user_id = NULL, assigned_at = NULL
     WHERE user_id = ?`,
    [userId]
  )
  const affected =
    typeof result === 'object' && result !== null && 'affectedRows' in result
      ? Number((result as { affectedRows: number }).affectedRows)
      : 0
  if (affected === 0) throw new Error('USER_HAS_NO_CODE')
}

export async function reassignSiteAccessCodeToUser(input: {
  userId: string
  code: string
}): Promise<void> {
  const normalized = normalizeSiteAccessCode(input.code)
  if (!normalized) throw new Error('INVALID_SITE_ACCESS_CODE')

  const current = await getSiteAccessCodeAssignment(input.userId)
  if (!current) throw new Error('USER_HAS_NO_CODE')
  if (current.code === normalized) return

  const targetRows = await queryDb<{ user_id: string | null }[]>(
    'SELECT user_id FROM site_access_codes WHERE code = ? LIMIT 1',
    [normalized]
  )
  if (!targetRows[0]) throw new Error('CODE_NOT_FOUND')
  if (targetRows[0].user_id && targetRows[0].user_id !== input.userId) {
    throw new Error('CODE_ALREADY_ASSIGNED')
  }

  // Release the buyer's current code back to the free pool before assigning the new one.
  await queryDb(
    `UPDATE site_access_codes
     SET user_id = NULL, assigned_at = NULL
     WHERE user_id = ?`,
    [input.userId]
  )

  const assignResult = await queryDb<{ affectedRows?: number }>(
    `UPDATE site_access_codes
     SET user_id = ?, assigned_at = CURRENT_TIMESTAMP
     WHERE code = ? AND user_id IS NULL`,
    [input.userId, normalized]
  )
  const affected =
    typeof assignResult === 'object' && assignResult !== null && 'affectedRows' in assignResult
      ? Number((assignResult as { affectedRows: number }).affectedRows)
      : 0
  if (affected === 0) throw new Error('CODE_ALREADY_ASSIGNED')
}
