import type { Metadata } from 'next'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildPageMetadata } from '@/lib/site-metadata'

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(
    'New Arrivals',
    'Latest templates and digital products added to the catalog.'
  )
}

export default function NewProductsPage() {
  return (
    <ShopCatalogPage
      config={{
        mode: 'new',
        title: 'New Arrivals',
        subtitle: 'Fresh templates and assets, added first here',
        icon: 'sparkles',
        emptyTitle: 'No new products yet',
        emptyMessage:
          'Check back soon — sellers are adding new items. Browse the full catalog in the meantime.',
      }}
    />
  )
}
