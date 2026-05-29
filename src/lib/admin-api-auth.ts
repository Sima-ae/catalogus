import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'
import { queryDb } from '@/lib/db'
import { isDbConnectionError } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getDevUserByIdAndEmail, isDevAuthEnabled, tryDevLogin } from '@/lib/dev-auth'
import { isSuperAdminUser } from '@/lib/user-roles'

type DbUser = {
  id: string
  email: string
  password_hash: string
  role: string
  is_super_admin?: number | boolean
}

/** Verify super-admin (role admin) credentials for sensitive API routes. */
export async function verifySuperAdmin(
  email: string,
  password: string
): Promise<{ ok: true; userId: string } | { ok: false }> {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !password) return { ok: false }

  try {
    let rows: DbUser[]
    try {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, password_hash, role, is_super_admin FROM users WHERE LOWER(email) = ? LIMIT 1',
        [normalized]
      )
    } catch {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, password_hash, role FROM users WHERE LOWER(email) = ? LIMIT 1',
        [normalized]
      )
    }
    const user = rows[0]
    if (!user || !isSuperAdminUser(user)) return { ok: false }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return { ok: false }

    return { ok: true, userId: user.id }
  } catch (error) {
    if (isDevAuthEnabled() && isDbConnectionError(error)) {
      const devUser = await tryDevLogin(normalized, password)
      if (devUser && isSuperAdminUser(devUser)) {
        return { ok: true, userId: devUser.id }
      }
    }
    return { ok: false }
  }
}

type AdminActor = {
  userId: string
  email: string
  isSuperAdmin: boolean
}

/** Verify logged-in admin from client auth headers (admin layout + localStorage session). */
export async function verifyAdminActor(
  request: NextRequest
): Promise<{ ok: true; actor: AdminActor } | { ok: false; status: number; error: string }> {
  const userId = request.headers.get('x-catalogus-user-id')?.trim()
  const email = request.headers.get('x-catalogus-user-email')?.trim().toLowerCase()

  if (!userId || !email) {
    return { ok: false, status: 401, error: 'Admin authentication required' }
  }

  try {
    let rows: DbUser[]
    try {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, password_hash, role, is_super_admin FROM users WHERE id = ? AND LOWER(email) = ? LIMIT 1',
        [userId, email]
      )
    } catch {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, password_hash, role FROM users WHERE id = ? AND LOWER(email) = ? LIMIT 1',
        [userId, email]
      )
    }

    const user = rows[0]
    if (!user || user.role !== 'admin') {
      return { ok: false, status: 403, error: 'Admin access required' }
    }

    return {
      ok: true,
      actor: {
        userId: user.id,
        email: user.email,
        isSuperAdmin: isSuperAdminUser(user),
      },
    }
  } catch (error) {
    if (isDevAuthEnabled() && isDbConnectionError(error)) {
      const devUser = getDevUserByIdAndEmail(userId, email)
      if (!devUser || devUser.role !== 'admin') {
        return { ok: false, status: 403, error: 'Admin access required' }
      }
      return {
        ok: true,
        actor: {
          userId: devUser.id,
          email: devUser.email,
          isSuperAdmin: isSuperAdminUser(devUser),
        },
      }
    }
    return { ok: false, status: 503, error: getDbErrorMessage(error, 'Database unavailable') }
  }
}

export function parseAdminCredentials(body: unknown): {
  email: string
  password: string
} | null {
  if (!body || typeof body !== 'object') return null
  const raw = body as Record<string, unknown>
  const email = String(raw.adminEmail ?? raw.email ?? '').trim()
  const password = String(raw.adminPassword ?? raw.password ?? '')
  if (!email || !password) return null
  return { email, password }
}
