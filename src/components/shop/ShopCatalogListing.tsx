'use client'

import CatalogLoadMoreSentinel from '@/components/shop/CatalogLoadMoreSentinel'
import CatalogProductCount from '@/components/shop/CatalogProductCount'
import CatalogPagination, { CATALOG_PAGE_SIZE } from '@/components/shop/CatalogPagination'
import SortableProductGrid from '@/components/shop/SortableProductGrid'
import type { ProductQuickEditSaved } from '@/components/shop/ProductCardBrandEditButton'
import { isCatalogAdminUser, useAuth } from '@/lib/auth-local'
import { PricelistMembershipBatchProvider } from '@/lib/pricelist-membership-batch-context'
import type { Product } from '@/lib/types'

type Props = {
  products: Product[]
  page: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
  onProductDeleted?: (productId: string) => void
  onProductQuickEditSaved?: (saved: ProductQuickEditSaved) => void
  onReorder?: (productIds: string[]) => void | Promise<void>
  reorderScope?: string | null
  reorderSaving?: boolean
  centered?: boolean
  hasMoreOnPage?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  /** Active header/catalog search — shows “N results for …” when set. */
  searchQuery?: string
  /** Exact total still loading (e.g. countOnly in flight). */
  countPending?: boolean
}

/** Shared product grid with server-backed pagination. */
export default function ShopCatalogListing({
  products,
  page,
  totalItems,
  pageSize = CATALOG_PAGE_SIZE,
  onPageChange,
  onProductDeleted,
  onProductQuickEditSaved,
  onReorder,
  reorderScope = null,
  reorderSaving = false,
  centered = false,
  hasMoreOnPage = false,
  loadingMore = false,
  onLoadMore,
  searchQuery,
  countPending = false,
}: Props) {
  const { user, loading: authLoading } = useAuth()
  const isCatalogAdmin = isCatalogAdminUser(user)
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const canReorder = Boolean(
    !authLoading && isCatalogAdmin && reorderScope && onReorder && !hasMoreOnPage
  )

  const listingBody = (
    <>
      <CatalogPagination
        page={safePage}
        totalItems={totalItems}
        pageSize={pageSize}
        loadedCount={products.length}
        onPageChange={onPageChange}
        centered={centered}
        compact={centered}
      />
      <PricelistMembershipBatchProvider productIds={products.map((p) => p.id)}>
        <SortableProductGrid
          products={products}
          reorderEnabled={canReorder}
          saving={reorderSaving}
          onReorder={onReorder ?? (() => undefined)}
          onProductDeleted={onProductDeleted}
          onProductQuickEditSaved={onProductQuickEditSaved}
        />
      </PricelistMembershipBatchProvider>
      <CatalogLoadMoreSentinel
        hasMore={hasMoreOnPage}
        loading={loadingMore}
        onLoadMore={onLoadMore ?? (() => undefined)}
      />
      <CatalogPagination
        page={safePage}
        totalItems={totalItems}
        pageSize={pageSize}
        loadedCount={products.length}
        onPageChange={onPageChange}
        centered={centered}
        compact={centered}
      />
    </>
  )

  const countBlock = (
    <CatalogProductCount
      count={totalItems}
      searchQuery={searchQuery}
      centered={centered}
      pending={countPending}
    />
  )

  return (
    <>
      {countBlock}
      {centered ? (
        <div className="flex flex-col gap-6 pb-6">{listingBody}</div>
      ) : (
        listingBody
      )}
    </>
  )
}

export { CATALOG_PAGE_SIZE }
