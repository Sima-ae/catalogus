import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import { getSiteAccessCodeForUser, releaseSiteAccessCodeForUser } from '@/lib/site-access-codes-db'
import { clampBadgeRating, isSuperAdminUser, type UserListRow } from '@/lib/user-roles'

export type CreateUserInput = {
  email: string
  password: string
  name?: string | null
  role: 'admin' | 'buyer' | 'seller'
  badge_rating?: number | null
  site_access_code?: string | null
}

export type UpdateUserInput = {
  email?: string
  password?: string
  name?: string | null
  role?: 'admin' | 'buyer' | 'seller'
  badge_rating?: number | null | undefined
  /** When false, badge_rating is not updated (e.g. regular admin edits). */
  updateBadgeRating?: boolean
}

const ALLOWED_ROLES = new Set(['admin', 'buyer', 'seller'])

function mapRow(row: Record<string, unknown>): UserListRow {
  const is_super_admin = Boolean(row.is_super_admin)
  const badge_rating = clampBadgeRating(row.badge_rating)
  const site_access_code =
    row.site_access_code != null && String(row.site_access_code).trim() !== ''
      ? String(row.site_access_code)
      : null
  return {
    id: String(row.id),
    email: String(row.email),
    role: String(row.role),
    name: row.name != null ? String(row.name) : null,
    is_super_admin,
    badge_rating,
    site_access_code,
    created_at: row.created_at != null ? String(row.created_at) : undefined,
    updated_at: row.updated_at != null ? String(row.updated_at) : undefined,
  }
}

export async function countUsers(): Promise<number> {
  const rows = await queryDb<{ total: number }[]>(`SELECT COUNT(*) AS total FROM users`)
  return Number(rows[0]?.total ?? 0)
}

export async function listUsers(): Promise<UserListRow[]> {
  try {
    const rows = await queryDb<Record<string, unknown>[]>(
      `SELECT u.id, u.email, u.role, u.name, u.is_super_admin, u.badge_rating,
              u.created_at, u.updated_at, sac.code AS site_access_code
       FROM users u
       LEFT JOIN site_access_codes sac ON sac.user_id = u.id
       ORDER BY u.created_at DESC`
    )
    return rows.map(mapRow)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (
      message.includes('Unknown column') ||
      message.includes("doesn't exist") ||
      message.includes('site_access_codes')
    ) {
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
      `SELECT u.id, u.email, u.role, u.name, u.is_super_admin, u.badge_rating,
              u.created_at, u.updated_at, sac.code AS site_access_code
       FROM users u
       LEFT JOIN site_access_codes sac ON sac.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    )
    if (!rows[0]) return null
    return mapRow(rows[0])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (
      message.includes('Unknown column') ||
      message.includes("doesn't exist") ||
      message.includes('site_access_codes')
    ) {
      const rows = await queryDb<Record<string, unknown>[]>(
        'SELECT id, email, role, name, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
        [userId]
      )
      if (!rows[0]) return null
      const mapped = mapRow({ ...rows[0], is_super_admin: 0, badge_rating: null })
      if (isSuperAdminUser(mapped)) mapped.is_super_admin = true
      mapped.site_access_code = await getSiteAccessCodeForUser(userId)
      return mapped
    }
    throw error
  }
}

export async function createUser(input: CreateUserInput): Promise<UserListRow> {
  const email = input.email.trim().toLowerCase()
  const password = input.password
  const role = input.role
  const name = input.name?.trim() || email.split('@')[0] || 'User'

  if (!email || !password) {
    throw new Error('Email and password are required')
  }
  if (!ALLOWED_ROLES.has(role)) {
    throw new Error('Invalid role')
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const badge_rating = input.badge_rating != null ? clampBadgeRating(input.badge_rating) : null
  if (input.badge_rating != null && badge_rating === null) {
    throw new Error('Rating must be between 1 and 5')
  }

  const existing = await queryDb<{ id: string }[]>(
    'SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1',
    [email]
  )
  if (existing[0]) {
    throw new Error('EMAIL_EXISTS')
  }

  const id = randomUUID()
  const password_hash = await bcrypt.hash(password, 12)

  try {
    await queryDb(
      `INSERT INTO users (id, email, password_hash, role, is_super_admin, badge_rating, name)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [id, email, password_hash, role, badge_rating, name]
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Unknown column')) {
      await queryDb(
        `INSERT INTO users (id, email, password_hash, role, name)
         VALUES (?, ?, ?, ?, ?)`,
        [id, email, password_hash, role, name]
      )
    } else if (message.includes('Duplicate') || message.includes('uq_users_email')) {
      throw new Error('EMAIL_EXISTS')
    } else {
      throw error
    }
  }

  try {
    await queryDb(
      `INSERT INTO user_profiles (id, email, name, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), role = VALUES(role)`,
      [id, email, name, role]
    )
  } catch {
    /* user_profiles optional on older schemas */
  }

  const created = await getUserProfile(id)
  if (!created) {
    throw new Error('Failed to load created user')
  }
  return created
}

export async function updateUser(input: UpdateUserInput, userId: string): Promise<UserListRow> {
  const existing = await getUserProfile(userId)
  if (!existing) {
    throw new Error('NOT_FOUND')
  }

  const email = input.email != null ? input.email.trim().toLowerCase() : existing.email
  const role = input.role ?? (existing.role as 'admin' | 'buyer' | 'seller')
  const name =
    input.name !== undefined
      ? input.name?.trim() || email.split('@')[0] || 'User'
      : existing.name || email.split('@')[0] || 'User'

  if (!email) throw new Error('Email is required')
  if (!ALLOWED_ROLES.has(role)) throw new Error('Invalid role')

  if (email !== existing.email.toLowerCase()) {
    const dup = await queryDb<{ id: string }[]>(
      'SELECT id FROM users WHERE LOWER(email) = ? AND id <> ? LIMIT 1',
      [email, userId]
    )
    if (dup[0]) throw new Error('EMAIL_EXISTS')
  }

  let password_hash: string | undefined
  if (input.password != null && input.password !== '') {
    if (input.password.length < 8) throw new Error('Password must be at least 8 characters')
    password_hash = await bcrypt.hash(input.password, 12)
  }

  let badge_rating = existing.badge_rating ?? null
  if (input.updateBadgeRating) {
    badge_rating =
      input.badge_rating === undefined
        ? existing.badge_rating ?? null
        : input.badge_rating === null
          ? null
          : clampBadgeRating(input.badge_rating)
    if (input.badge_rating != null && badge_rating === null) {
      throw new Error('Rating must be between 1 and 5')
    }
  }

  if (existing.is_super_admin && role !== 'admin') {
    throw new Error('SUPER_ADMIN_ROLE')
  }

  const params: unknown[] = []
  const sets: string[] = ['email = ?', 'role = ?', 'name = ?']
  params.push(email, role, name)

  if (password_hash) {
    sets.push('password_hash = ?')
    params.push(password_hash)
  }
  if (input.updateBadgeRating) {
    sets.push('badge_rating = ?')
    params.push(badge_rating)
  }

  params.push(userId)

  try {
    await queryDb(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('Duplicate') || message.includes('uq_users_email')) {
      throw new Error('EMAIL_EXISTS')
    }
    throw error
  }

  try {
    await queryDb(
      `INSERT INTO user_profiles (id, email, name, role)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), role = VALUES(role)`,
      [userId, email, name, role]
    )
  } catch {
    /* optional */
  }

  const updated = await getUserProfile(userId)
  if (!updated) throw new Error('Failed to load updated user')
  return updated
}

export async function deleteUser(userId: string): Promise<void> {
  const existing = await getUserProfile(userId)
  if (!existing) throw new Error('NOT_FOUND')
  if (existing.is_super_admin) throw new Error('SUPER_ADMIN_DELETE')

  await releaseSiteAccessCodeForUser(userId)

  try {
    await queryDb('DELETE FROM user_profiles WHERE id = ?', [userId])
  } catch {
    /* optional */
  }

  try {
    await queryDb('DELETE FROM users WHERE id = ?', [userId])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('foreign key') || message.includes('FOREIGN KEY')) {
      throw new Error('HAS_REFERENCES')
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
