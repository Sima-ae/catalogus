'use client'

import ProductCard from '@/components/shop/ProductCard'
import CatalogProductCount from '@/components/shop/CatalogProductCount'
import CatalogPagination, {
  CATALOG_PAGE_SIZE,
  catalogGridClassName,
} from '@/components/shop/CatalogPagination'
import type { Product } from '@/lib/types'

type Props = {
  products: Product[]
  page: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
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
  centered = false,
  loading = false,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)

  return (
    <>
      {!centered ? <CatalogProductCount count={totalItems} /> : null}
      <CatalogPagination
        page={safePage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        centered={centered}
      />
      <div className={`${catalogGridClassName} ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <CatalogPagination
        page={safePage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        centered={centered}
      />
    </>
  )
}

export { CATALOG_PAGE_SIZE }
