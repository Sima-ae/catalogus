import type { NextRequest } from 'next/server'
import { verifyAdminActor } from '@/lib/admin-api-auth'
import { verifySellerActor } from '@/lib/seller-api-auth'
import { productBelongsToSeller, type SellerActor } from '@/lib/product-ownership'
import type { Product } from '@/lib/types'
import type { ProductInput } from '@/lib/products-db'
import { sellerAuthorIcon, sellerDisplayName } from '@/lib/product-ownership'

export type CatalogAccess =
  | { kind: 'public' }
  | { kind: 'admin'; actor: { userId: string; email: string; isSuperAdmin: boolean } }
  | { kind: 'seller'; actor: SellerActor }

export async function resolveCatalogAccess(request: NextRequest): Promise<CatalogAccess> {
  const admin = await verifyAdminActor(request)
  if (admin.ok) return { kind: 'admin', actor: admin.actor }

  const seller = await verifySellerActor(request)
  if (seller.ok) return { kind: 'seller', actor: seller.actor }

  return { kind: 'public' }
}

export async function requireProductWrite(
  request: NextRequest
): Promise<
  | { ok: true; access: Exclude<CatalogAccess, { kind: 'public' }> }
  | { ok: false; status: number; error: string }
> {
  const access = await resolveCatalogAccess(request)
  if (access.kind === 'public') {
    return { ok: false, status: 401, error: 'Authentication required' }
  }
  return { ok: true, access }
}

export type ProductOwnershipRow = {
  author_id?: string | null
  author?: string | null
}

export function sellerMayViewProduct(
  access: CatalogAccess,
  product: ProductOwnershipRow
): boolean {
  if (access.kind === 'public' || access.kind === 'admin') return true
  return productBelongsToSeller(product, access.actor)
}

export function sellerOwnsProductOrForbidden(
  access: CatalogAccess,
  product: ProductOwnershipRow
): { ok: true } | { ok: false; status: number; error: string } {
  if (sellerMayViewProduct(access, product)) return { ok: true }
  return { ok: false, status: 403, error: 'You can only access your own products' }
}

/** Force seller ownership fields; strip admin-only columns for seller writes. */
export function applySellerProductInput(
  input: ProductInput,
  seller: SellerActor
): ProductInput {
  const name = sellerDisplayName(seller)
  const { purchase_price: _pp, ...rest } = input
  return {
    ...rest,
    author: name,
    author_icon: sellerAuthorIcon(seller),
    author_id: seller.userId,
    featured: false,
    rating: undefined,
    review_count: undefined,
    download_count: undefined,
  }
}
