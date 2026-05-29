import type { Metadata } from 'next'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildPageMetadata } from '@/lib/site-metadata'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(
    'Most Popular',
    'Top-rated and best-selling digital products in the catalog.'
  )
}

export default function PopularProductsPage() {
  return (
    <ShopCatalogPage
      config={{
        mode: 'popular',
        title: 'Most Popular',
        subtitle: 'Best sellers and community favorites',
        icon: 'fire',
        emptyTitle: 'No popular products yet',
        emptyMessage:
          'As customers download and review items, rankings will appear here. Explore the full catalog to get started.',
      }}
    />
  )
}
