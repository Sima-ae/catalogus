import ShopCatalogPage from '@/components/shop/ShopCatalogPage'

export const metadata = {
  title: 'New Arrivals',
  description: 'Latest templates and digital products added to Super Clones',
}

export default function NewProductsPage() {
  return (
    <ShopCatalogPage
      config={{
        mode: 'new',
        title: 'New Arrivals',
        subtitle: 'Fresh templates and assets, added first here',
        description:
          'Discover the newest WordPress themes, plugins, and digital products in our catalog. Sorted by release date so you always see what landed latest.',
        badge: 'Just added',
        icon: 'sparkles',
        emptyTitle: 'No new products yet',
        emptyMessage:
          'Check back soon — sellers are adding new items. Browse the full catalog in the meantime.',
      }}
    />
  )
}
