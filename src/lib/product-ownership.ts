import type { Product } from '@/lib/types'

export type SellerActor = {
  userId: string
  email: string
  name: string
}

export function sellerDisplayName(actor: SellerActor): string {
  const name = String(actor.name || '').trim()
  if (name) return name
  const local = actor.email.split('@')[0]?.trim()
  return local || 'Seller'
}

export function sellerAuthorIcon(actor: SellerActor): string {
  const ch = sellerDisplayName(actor).charAt(0)
  return ch ? ch.toUpperCase() : 'S'
}

/** True when this product row belongs to the signed-in seller. */
export function productBelongsToSeller(
  product: { author_id?: string | null; author?: string | null },
  seller: SellerActor
): boolean {
  const sellerId = String(seller.userId || '').trim()
  if (product.author_id && String(product.author_id) === sellerId) return true

  const author = String(product.author || '')
    .trim()
    .toLowerCase()
  if (!author) return false

  const name = sellerDisplayName(seller).toLowerCase()
  if (name && author === name) return true

  const emailLocal = seller.email.split('@')[0]?.trim().toLowerCase()
  if (emailLocal && author === emailLocal) return true

  return false
}
