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
  onPageChange: (page: number) => void
}

/** Shared product grid with top/bottom pagination (max {CATALOG_PAGE_SIZE} per page). */
export default function ShopCatalogListing({ products, page, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(products.length / CATALOG_PAGE_SIZE) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * CATALOG_PAGE_SIZE
  const pageProducts = products.slice(start, start + CATALOG_PAGE_SIZE)

  return (
    <>
      <CatalogProductCount count={products.length} />
      <CatalogPagination
        page={safePage}
        totalItems={products.length}
        onPageChange={onPageChange}
      />
      <div className={catalogGridClassName}>
        {pageProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <CatalogPagination
        page={safePage}
        totalItems={products.length}
        onPageChange={onPageChange}
      />
    </>
  )
}

export { CATALOG_PAGE_SIZE }
