import type { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import type { CatalogActor } from '@/lib/catalog-user-auth'
import {
  canSetPricelistPrices,
  canManagePricelistItems,
  canViewPricelist,
  defaultPricelistOwnerForActor,
} from '@/lib/catalog-user-auth'
import { resolvePricelistOwnerId } from '@/lib/pricelist-pages-db'
import {
  readPricelistContributorId,
  getPricelistContributorCookieOptions,
  PRICELIST_CONTRIBUTOR_COOKIE,
} from '@/lib/pricelist-access-cookie'
import {
  resolvePricelistAccess,
  type PricelistAccessContext,
  type PricelistAccessMode,
} from '@/lib/pricelist-access'

export type { PricelistAccessContext, PricelistAccessMode }

export async function resolveListOwnerId(
  actor: CatalogActor,
  ownerParam: string | null | undefined
): Promise<{ ok: true; ownerId: string } | { ok: false; status: number; error: string }> {
  const parsed = await resolvePricelistOwnerId(ownerParam)
  const ownerId = parsed ?? defaultPricelistOwnerForActor(actor)

  if (!(await canViewPricelist(actor, ownerId))) {
    return { ok: false, status: 403, error: 'You cannot access this pricelist' }
  }

  return { ok: true, ownerId }
}

export async function requirePricelistAccess(
  request: NextRequest,
  ownerParam: string | null | undefined,
  options?: { allowGuest?: boolean }
): Promise<PricelistAccessContext> {
  const access = await resolvePricelistAccess(request, ownerParam)
  if (!access.ok) return access
  if (access.mode === 'guest' && !options?.allowGuest) {
    return {
      ok: false,
      status: 401,
      error: 'Sign in required for this action',
      requiresLogin: true,
      ownerId: access.ownerId,
    }
  }
  return access
}

export async function assertManageItems(
  actor: CatalogActor,
  ownerId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!(await canManagePricelistItems(actor, ownerId))) {
    return { ok: false, status: 403, error: 'You cannot modify this pricelist' }
  }
  return { ok: true }
}

export async function assertSetPrices(
  actor: CatalogActor,
  ownerId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!(await canSetPricelistPrices(actor, ownerId))) {
    return { ok: false, status: 403, error: 'You cannot set prices on this pricelist' }
  }
  return { ok: true }
}

export type PricelistPriceActor =
  | { kind: 'guest'; contributorId: string; setContributorCookie?: string }
  | { kind: 'user'; userId: string }

/** Resolve who may save a price row (logged-in seller/admin or share-link guest). */
export async function resolvePricelistPriceActor(
  request: NextRequest,
  access: Extract<PricelistAccessContext, { ok: true }>
): Promise<
  { ok: true; actor: PricelistPriceActor } | { ok: false; status: number; error: string }
> {
  if (access.mode === 'guest') {
    const existing = readPricelistContributorId(request.headers.get('cookie'))
    const contributorId = existing ?? randomUUID()
    return {
      ok: true,
      actor: {
        kind: 'guest',
        contributorId,
        setContributorCookie: existing ? undefined : contributorId,
      },
    }
  }

  if (!access.actor) {
    return { ok: false, status: 401, error: 'Sign in required' }
  }

  const perm = await assertSetPrices(access.actor, access.ownerId)
  if (!perm.ok) return perm

  return { ok: true, actor: { kind: 'user', userId: access.actor.userId } }
}

export function applyPricelistContributorCookie(
  response: { cookies: { set: (name: string, value: string, options: object) => void } },
  contributorId: string | undefined
): void {
  if (!contributorId) return
  response.cookies.set(
    PRICELIST_CONTRIBUTOR_COOKIE,
    contributorId,
    getPricelistContributorCookieOptions()
  )
}
