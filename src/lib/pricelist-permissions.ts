import { isPlatformPricelistOwner } from '@/lib/pricelist-constants'

export type PricelistCuratorActor = {
  userId: string
  role: 'admin' | 'buyer' | 'seller'
  isSuperAdmin: boolean
}

function canActAsPricelistAdmin(actor: PricelistCuratorActor): boolean {
  return actor.role === 'admin' || actor.isSuperAdmin
}

/** Add/remove products via star (admin/super admin on platform, buyer on own list — not sellers). */
export function canCuratePricelistWithStar(
  actor: PricelistCuratorActor,
  listOwnerId: string
): boolean {
  if (actor.role === 'seller') return false
  if (isPlatformPricelistOwner(listOwnerId)) {
    return canActAsPricelistAdmin(actor)
  }
  return listOwnerId === actor.userId
}
