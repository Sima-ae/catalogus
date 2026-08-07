import type { Metadata } from 'next'
import { headers } from 'next/headers'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildPageMetadata } from '@/lib/site-metadata'
import { getServerLocale } from '@/lib/i18n-server-locale'
import {
  buildShopCatalogSignature,
  loadInitialShopCatalog,
  shouldServerRenderShopCatalog,
} from '@/lib/shop-catalog-ssr'
import { listShopCategoryNavTree } from '@/lib/products-db'
import { resolveStoreModeFromHeaders } from '@/lib/store-host'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return buildPageMetadata(
    'New Arrivals',
    'Products added to the catalog this week (Sunday through Sunday).',
    locale
  )
}

/**
 * SSR category nav + first product page in parallel so the menu is not blocked
 * behind the week listing, and the grid still paints without a client round-trip.
 */
export default async function NewProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const featuredOnly = resolveStoreModeFromHeaders(headers()) === 'featured'
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'new')
  const shouldSsrCatalog = shouldServerRenderShopCatalog(sp)

  const [initialCatalog, initialCategoryNav] = await Promise.all([
    shouldSsrCatalog ? loadInitialShopCatalog(sp, 'new') : Promise.resolve(null),
    listShopCategoryNavTree({ featuredOnly }).catch(() => []),
  ])

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
      initialCatalogSignature={initialCatalogSignature}
      initialCategoryNav={initialCategoryNav}
    />
  )
}
