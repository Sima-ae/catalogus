'use client'

import CatalogProductCount from '@/components/shop/CatalogProductCount'
import CatalogPagination, { CATALOG_PAGE_SIZE } from '@/components/shop/CatalogPagination'
import SortableProductGrid from '@/components/shop/SortableProductGrid'
import { useAuth } from '@/lib/auth-local'
import type { Product } from '@/lib/types'

type Props = {
  products: Product[]
  page: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
  onProductDeleted?: (productId: string) => void
  onReorder?: (productIds: string[]) => void | Promise<void>
  reorderScope?: string | null
  reorderSaving?: boolean
  centered?: boolean
  loading?: boolean
}

/** Shared product grid with server-backed pagination. */
export default function ShopCatalogListing({
  products,
  page,
  totalItems,
  pageSize = CATALOG_PAGE_SIZE,
  onPageChange,
  onProductDeleted,
  onReorder,
  reorderScope = null,
  reorderSaving = false,
  centered = false,
  loading = false,
}: Props) {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const canReorder = Boolean(
    !authLoading && user && isAdmin && reorderScope && onReorder
  )

  const listingBody = (
    <>
      <CatalogPagination
        page={safePage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        centered={centered}
        compact={centered}
      />
      {canReorder ? (
        <p className="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
          Hold a product card, then drag to reorder
        </p>
      ) : null}
      <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
        <SortableProductGrid
          products={products}
          reorderEnabled={canReorder}
          saving={reorderSaving || loading}
          onReorder={onReorder ?? (() => undefined)}
          onProductDeleted={onProductDeleted}
        />
      </div>
      <CatalogPagination
        page={safePage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        centered={centered}
        compact={centered}
      />
    </>
  )

  return (
    <>
      {!centered ? <CatalogProductCount count={totalItems} /> : null}
      {centered ? (
        <div className="flex flex-col gap-6 pb-6">{listingBody}</div>
      ) : (
        listingBody
      )}
    </>
  )
}

export { CATALOG_PAGE_SIZE }
