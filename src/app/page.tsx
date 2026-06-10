import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { CATALOG_PAGE_SIZE } from '@/components/shop/CatalogPagination'
import { listActiveProductsPaginated } from '@/lib/products-db'

export default async function HomePage() {
  let initialCatalog = null
  try {
    initialCatalog = await listActiveProductsPaginated({
      page: 1,
      limit: CATALOG_PAGE_SIZE,
    })
  } catch {
    // Client-side fetch fallback if DB is unavailable during SSR.
  }

  return (
    <ShopCatalogPage
      config={{
        mode: 'all',
        title: 'WELCOME',
        searchPlaceholder: 'Search products...',
        showSocialProof: true,
        showFooterTagline: false,
        emptyVariant: 'simple',
        centerCatalog: true,
      }}
      initialCatalog={initialCatalog}
    />
  )
}
