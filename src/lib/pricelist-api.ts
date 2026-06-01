import type { CatalogActor } from '@/lib/catalog-user-auth'
import {
  canManagePricelistItems,
  canSetPricelistPrices,
  canViewPricelist,
  defaultPricelistOwnerForActor,
} from '@/lib/catalog-user-auth'
import { parsePricelistOwnerParam } from '@/lib/pricelist-constants'

export async function resolveListOwnerId(
  actor: CatalogActor,
  ownerParam: string | null | undefined
): Promise<{ ok: true; ownerId: string } | { ok: false; status: number; error: string }> {
  const parsed = parsePricelistOwnerParam(ownerParam)
  const ownerId = parsed ?? defaultPricelistOwnerForActor(actor)

  if (!(await canViewPricelist(actor, ownerId))) {
    return { ok: false, status: 403, error: 'You cannot access this pricelist' }
  }

  return { ok: true, ownerId }
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
