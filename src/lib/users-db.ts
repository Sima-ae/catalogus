import { queryDb } from '@/lib/db'
import { clampBadgeRating, isSuperAdminUser, type UserListRow } from '@/lib/user-roles'

function mapRow(row: Record<string, unknown>): UserListRow {
  const is_super_admin = Boolean(row.is_super_admin)
  const badge_rating = clampBadgeRating(row.badge_rating)
  return {
    id: String(row.id),
    email: String(row.email),
    role: String(row.role),
    name: row.name != null ? String(row.name) : null,
    is_super_admin,
    badge_rating,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  }
}

export async function listUsers(): Promise<UserListRow[]> {
  try {
    const rows = await queryDb<Record<string, unknown>[]>(
      `SELECT id, email, role, name, is_super_admin, badge_rating, created_at, updated_at
       FROM users ORDER BY created_at DESC`
    )
    return rows.map(mapRow)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Unknown column')) {
      const legacy = await queryDb<Record<string, unknown>[]>(
        'SELECT id, email, role, name, created_at, updated_at FROM users ORDER BY created_at DESC'
      )
      return legacy.map((row) => {
        const mapped = mapRow({ ...row, is_super_admin: 0, badge_rating: null })
        if (isSuperAdminUser(mapped)) mapped.is_super_admin = true
        return mapped
      })
    }
    throw error
  }
}

export async function getUserProfile(userId: string): Promise<UserListRow | null> {
  try {
    const rows = await queryDb<Record<string, unknown>[]>(
      `SELECT id, email, role, name, is_super_admin, badge_rating, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    )
    if (!rows[0]) return null
    return mapRow(rows[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Unknown column')) {
      const rows = await queryDb<Record<string, unknown>[]>(
        'SELECT id, email, role, name, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
        [userId]
      )
      if (!rows[0]) return null
      const mapped = mapRow({ ...rows[0], is_super_admin: 0, badge_rating: null })
      if (isSuperAdminUser(mapped)) mapped.is_super_admin = true
      return mapped
    }
    throw error
  }
}

export async function updateUserBadgeRating(
  userId: string,
  rating: number | null
): Promise<UserListRow | null> {
  const clamped = rating === null ? null : clampBadgeRating(rating)
  if (rating !== null && clamped === null) {
    throw new Error('Rating must be between 1 and 5')
  }

  try {
    await queryDb('UPDATE users SET badge_rating = ? WHERE id = ?', [clamped, userId])
    return getUserProfile(userId)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Unknown column')) {
      throw new Error(
        'badge_rating column missing — run db/upgrade.sql on your database'
      )
    }
    throw error
  }
}
