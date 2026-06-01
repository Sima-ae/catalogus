import type { NextRequest } from 'next/server'
import { queryDb } from '@/lib/db'
import { isDbConnectionError } from '@/lib/db'
import { getDbErrorMessage } from '@/lib/db-errors'
import { getDevUserByIdAndEmail, isDevAuthEnabled } from '@/lib/dev-auth'
import { isSuperAdminUser } from '@/lib/user-roles'
import {
  isPlatformPricelistOwner,
  PLATFORM_PRICELIST_OWNER_ID,
} from '@/lib/pricelist-constants'
import { hasApprovedSellerAccess } from '@/lib/seller-pricelist-access-db'

export type CatalogActor = {
  userId: string
  email: string
  role: 'admin' | 'buyer' | 'seller'
  name: string | null
  isSuperAdmin: boolean
}

type DbUser = {
  id: string
  email: string
  role: string
  name: string | null
  is_super_admin?: number | boolean
}

export async function tryVerifyCatalogActor(request: NextRequest): Promise<CatalogActor | null> {
  const result = await verifyCatalogActor(request)
  return result.ok ? result.actor : null
}

export async function verifyCatalogActor(
  request: NextRequest
): Promise<{ ok: true; actor: CatalogActor } | { ok: false; status: number; error: string }> {
  const userId = request.headers.get('x-catalogus-user-id')?.trim()
  const email = request.headers.get('x-catalogus-user-email')?.trim().toLowerCase()

  if (!userId || !email) {
    return { ok: false, status: 401, error: 'Authentication required' }
  }

  try {
    let rows: DbUser[]
    try {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, role, name, is_super_admin FROM users WHERE id = ? AND LOWER(email) = ? LIMIT 1',
        [userId, email]
      )
    } catch {
      rows = await queryDb<DbUser[]>(
        'SELECT id, email, role, name FROM users WHERE id = ? AND LOWER(email) = ? LIMIT 1',
        [userId, email]
      )
    }

    const user = rows[0]
    if (!user) {
      return { ok: false, status: 403, error: 'Invalid session' }
    }

    const role = user.role as CatalogActor['role']
    if (role !== 'admin' && role !== 'buyer' && role !== 'seller') {
      return { ok: false, status: 403, error: 'Invalid role' }
    }

    return {
      ok: true,
      actor: {
        userId: user.id,
        email: user.email,
        role,
        name: user.name,
        isSuperAdmin: isSuperAdminUser(user),
      },
    }
  } catch (error) {
    if (isDevAuthEnabled() && isDbConnectionError(error)) {
      const devUser = getDevUserByIdAndEmail(userId, email)
      if (!devUser) {
        return { ok: false, status: 403, error: 'Invalid session' }
      }
      const role = devUser.role as CatalogActor['role']
      if (role !== 'admin' && role !== 'buyer' && role !== 'seller') {
        return { ok: false, status: 403, error: 'Invalid role' }
      }
      return {
        ok: true,
        actor: {
          userId: devUser.id,
          email: devUser.email,
          role,
          name: devUser.name || null,
          isSuperAdmin: isSuperAdminUser(devUser),
        },
      }
    }
    return { ok: false, status: 503, error: getDbErrorMessage(error, 'Database unavailable') }
  }
}

function canActAsPricelistAdmin(actor: CatalogActor): boolean {
  return actor.role === 'admin' || actor.isSuperAdmin
}

export function defaultPricelistOwnerForActor(actor: CatalogActor): string {
  if (canActAsPricelistAdmin(actor)) return PLATFORM_PRICELIST_OWNER_ID
  return actor.userId
}

export function starTargetOwnerForActor(actor: CatalogActor): string {
  if (canActAsPricelistAdmin(actor)) return PLATFORM_PRICELIST_OWNER_ID
  return actor.userId
}

export async function canViewPricelist(
  actor: CatalogActor,
  listOwnerId: string
): Promise<boolean> {
  if (isPlatformPricelistOwner(listOwnerId)) {
    if (canActAsPricelistAdmin(actor)) return true
    if (actor.role === 'seller') {
      return hasApprovedSellerAccess(actor.userId, PLATFORM_PRICELIST_OWNER_ID)
    }
    return false
  }

  if (listOwnerId === actor.userId) return true

  if (actor.role === 'seller') {
    return hasApprovedSellerAccess(actor.userId, listOwnerId)
  }

  return false
}

export async function canManagePricelistItems(
  actor: CatalogActor,
  listOwnerId: string
): Promise<boolean> {
  if (isPlatformPricelistOwner(listOwnerId)) {
    return canActAsPricelistAdmin(actor)
  }
  return listOwnerId === actor.userId
}

/** Share password + link settings — list owner only (not sellers/admins filling prices). */
export function isPricelistOwner(actor: CatalogActor, listOwnerId: string): boolean {
  if (isPlatformPricelistOwner(listOwnerId)) {
    return actor.isSuperAdmin
  }
  return listOwnerId === actor.userId
}

export async function canSetPricelistPrices(
  actor: CatalogActor,
  listOwnerId: string
): Promise<boolean> {
  if (actor.role !== 'seller') return false
  return canViewPricelist(actor, listOwnerId)
}
