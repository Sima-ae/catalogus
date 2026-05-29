import type { NextRequest } from 'next/server'
import { queryDb } from '@/lib/db'
import { isDbConnectionError } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getDevUserByIdAndEmail, isDevAuthEnabled } from '@/lib/dev-auth'
import type { SellerActor } from '@/lib/product-ownership'
import { sellerDisplayName } from '@/lib/product-ownership'

type DbUser = {
  id: string
  email: string
  role: string
  name: string | null
}

/** Verify logged-in seller from client auth headers. */
export async function verifySellerActor(
  request: NextRequest
): Promise<{ ok: true; actor: SellerActor } | { ok: false; status: number; error: string }> {
  const userId = request.headers.get('x-catalogus-user-id')?.trim()
  const email = request.headers.get('x-catalogus-user-email')?.trim().toLowerCase()

  if (!userId || !email) {
    return { ok: false, status: 401, error: 'Seller authentication required' }
  }

  try {
    const rows = await queryDb<DbUser[]>(
      'SELECT id, email, role, name FROM users WHERE id = ? AND LOWER(email) = ? LIMIT 1',
      [userId, email]
    )
    const user = rows[0]
    if (!user || user.role !== 'seller') {
      return { ok: false, status: 403, error: 'Seller access required' }
    }

    return {
      ok: true,
      actor: {
        userId: user.id,
        email: user.email,
        name: sellerDisplayName({ userId: user.id, email: user.email, name: user.name || '' }),
      },
    }
  } catch (error) {
    if (isDevAuthEnabled() && isDbConnectionError(error)) {
      const devUser = getDevUserByIdAndEmail(userId, email)
      if (!devUser || devUser.role !== 'seller') {
        return { ok: false, status: 403, error: 'Seller access required' }
      }
      return {
        ok: true,
        actor: {
          userId: devUser.id,
          email: devUser.email,
          name: sellerDisplayName({
            userId: devUser.id,
            email: devUser.email,
            name: devUser.name || '',
          }),
        },
      }
    }
    return { ok: false, status: 503, error: getDbErrorMessage(error, 'Database unavailable') }
  }
}
