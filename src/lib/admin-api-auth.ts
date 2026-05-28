import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import { isDevAuthEnabled, tryDevLogin } from '@/lib/dev-auth'
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

  if (isDevAuthEnabled()) {
    const devUser = await tryDevLogin(normalized, password)
    if (devUser && isSuperAdminUser(devUser)) {
      return { ok: true, userId: devUser.id }
    }
    return { ok: false }
  }

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
