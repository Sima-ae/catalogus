import type { NextRequest } from 'next/server'
import {
  canViewPricelist,
  defaultPricelistOwnerForActor,
  tryVerifyCatalogActor,
  type CatalogActor,
} from '@/lib/catalog-user-auth'
import { parsePricelistOwnerParam } from '@/lib/pricelist-constants'
import {
  createPricelistUnlockToken,
  readPricelistUnlockCookie,
  verifyPricelistUnlockToken,
} from '@/lib/pricelist-access-cookie'
import {
  getPricelistShareSettings,
  verifyPricelistSharePassword,
} from '@/lib/pricelist-share-db'

export type PricelistAccessMode = 'full' | 'guest'

export type PricelistAccessContext =
  | { ok: true; ownerId: string; mode: PricelistAccessMode; actor: CatalogActor | null }
  | {
      ok: false
      status: number
      error: string
      requiresLogin?: boolean
      requiresPassword?: boolean
      ownerId?: string
    }

export function resolveOwnerIdFromParam(
  ownerParam: string | null | undefined,
  actor: CatalogActor | null
): string {
  const parsed = parsePricelistOwnerParam(ownerParam)
  if (parsed) return parsed
  if (actor) return defaultPricelistOwnerForActor(actor)
  throw new Error('OWNER_REQUIRED')
}

export async function isPricelistUnlocked(
  request: NextRequest,
  listOwnerId: string
): Promise<boolean> {
  const settings = await getPricelistShareSettings(listOwnerId)
  if (!settings.has_password) return false
  const token = readPricelistUnlockCookie(request.headers.get('cookie'))
  return verifyPricelistUnlockToken(token, listOwnerId, settings.version)
}

export async function resolvePricelistAccess(
  request: NextRequest,
  ownerParam: string | null | undefined
): Promise<PricelistAccessContext> {
  let ownerId: string
  try {
    const actor = await tryVerifyCatalogActor(request)
    ownerId = resolveOwnerIdFromParam(ownerParam, actor)
  } catch {
    const parsed = parsePricelistOwnerParam(ownerParam)
    if (!parsed) {
      return {
        ok: false,
        status: 401,
        error: 'Sign in or open a shared pricelist link with ?owner=',
        requiresLogin: true,
      }
    }
    ownerId = parsed
  }

  const actor = await tryVerifyCatalogActor(request)
  const settings = await getPricelistShareSettings(ownerId)

  if (actor && (await canViewPricelist(actor, ownerId))) {
    return { ok: true, ownerId, mode: 'full', actor }
  }

  const token = readPricelistUnlockCookie(request.headers.get('cookie'))
  const unlocked = settings.has_password
    ? await verifyPricelistUnlockToken(token, ownerId, settings.version)
    : false

  if (unlocked) {
    return { ok: true, ownerId, mode: 'guest', actor: null }
  }

  if (actor) {
    return {
      ok: false,
      status: 403,
      error: 'You cannot access this pricelist',
      ownerId,
    }
  }

  if (settings.has_password) {
    return {
      ok: false,
      status: 401,
      error: 'Pricelist password required',
      requiresPassword: true,
      ownerId,
    }
  }

  return {
    ok: false,
    status: 401,
    error: 'Sign in to view this pricelist',
    requiresLogin: true,
    ownerId,
  }
}

export { verifyPricelistSharePassword, getPricelistShareSettings, createPricelistUnlockToken }
