import type { Metadata } from 'next'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { CATALOG_PAGE_SIZE } from '@/components/shop/CatalogPagination'
import { buildPageMetadata } from '@/lib/site-metadata'
import { getServerLocale } from '@/lib/i18n-server-locale'
import { listActiveProductsPaginated } from '@/lib/products-db'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return buildPageMetadata(
    'New Arrivals',
    'Products added to the catalog this week (Sunday through Sunday).',
    locale
  )
}

export default async function NewProductsPage() {
  let initialCatalog = null
  try {
    initialCatalog = await listActiveProductsPaginated({
      page: 1,
      limit: CATALOG_PAGE_SIZE,
      mode: 'new',
    })
  } catch {
    // Client-side fetch fallback if DB is unavailable during SSR.
  }

  return (
    <ShopCatalogPage
      config={{
        mode: 'new',
        title: 'New Arrivals',
        searchPlaceholder: 'Search new products...',
        showSocialProof: true,
        showFooterTagline: false,
        emptyVariant: 'featured',
        icon: 'sparkles',
        emptyTitle: 'No new products this week',
        emptyMessage:
          'Nothing was added during the current catalog week yet. The list resets every Sunday at midnight. Browse the full catalog on Home in the meantime.',
        centerCatalog: true,
      }}
      initialCatalog={initialCatalog}
    />
  )
}
