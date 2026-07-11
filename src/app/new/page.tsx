import type { Metadata } from 'next'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildPageMetadata } from '@/lib/site-metadata'
import { getServerLocale } from '@/lib/i18n-server-locale'
import {
  buildShopCatalogSignature,
  loadInitialShopCatalog,
  shouldServerRenderShopCatalog,
} from '@/lib/shop-catalog-ssr'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return buildPageMetadata(
    'New Arrivals',
    'Products added to the catalog this week (Sunday through Sunday).',
    locale
  )
}

export default async function NewProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'new')
  let initialCatalog = null
  if (shouldServerRenderShopCatalog(sp)) {
    try {
      initialCatalog = await loadInitialShopCatalog(sp, 'new')
    } catch {
      // Client-side fetch fallback if DB is unavailable during SSR.
    }
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
      initialCatalogSignature={initialCatalogSignature}
    />
  )
}
