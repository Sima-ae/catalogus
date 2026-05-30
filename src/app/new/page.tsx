import type { Metadata } from 'next'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildPageMetadata } from '@/lib/site-metadata'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(
    'New Arrivals',
    'Products added to the catalog this week (Sunday through Sunday).'
  )
}

export default function NewProductsPage() {
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
      }}
    />
  )
}
