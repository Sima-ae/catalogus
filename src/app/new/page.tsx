import type { Metadata } from 'next'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildPageMetadata } from '@/lib/site-metadata'
import { getServerLocale } from '@/lib/i18n-server-locale'
import {
  buildShopCatalogSignature,
  loadInitialShopCatalog,
  shouldServerRenderShopCatalog,
} from '@/lib/shop-catalog-ssr'

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
 * /new is a week-range listing (usually a few thousand rows) — SSR the first
 * unfiltered page so the grid paints without waiting on a client round-trip.
 * Filtered navigations stay client-only (same as category clicks on home).
 */
export default async function NewProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'new')
  const initialCatalog = shouldServerRenderShopCatalog(sp)
    ? await loadInitialShopCatalog(sp, 'new')
    : null

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
    />
  )
}
