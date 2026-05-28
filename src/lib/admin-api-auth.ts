import bcrypt from 'bcryptjs'
import { queryDb } from '@/lib/db'
import { isDevAuthEnabled, tryDevLogin } from '@/lib/dev-auth'

type DbUser = {
  id: string
  email: string
  password_hash: string
  role: string
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
    if (devUser?.role === 'admin') {
      return { ok: true, userId: devUser.id }
    }
    return { ok: false }
  }

  const rows = await queryDb<DbUser[]>(
    'SELECT id, email, password_hash, role FROM users WHERE LOWER(email) = ? LIMIT 1',
    [normalized]
  )
  const user = rows[0]
  if (!user || user.role !== 'admin') return { ok: false }

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
