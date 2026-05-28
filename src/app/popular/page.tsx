import ShopCatalogPage from '@/components/shop/ShopCatalogPage'

export const metadata = {
  title: 'Most Popular',
  description: 'Top-rated and best-selling digital products on Super Clones',
}

export default function PopularProductsPage() {
  return (
    <ShopCatalogPage
      config={{
        mode: 'popular',
        title: 'Most Popular',
        subtitle: 'Best sellers and community favorites',
        description:
          'These products lead the marketplace by downloads, ratings, and reviews. A trusted starting point when you want proven quality.',
        badge: 'Trending',
        icon: 'fire',
        emptyTitle: 'No popular products yet',
        emptyMessage:
          'As customers download and review items, rankings will appear here. Explore the full catalog to get started.',
      }}
    />
  )
}
