import ShopCatalogPage from '@/components/shop/ShopCatalogPage'

export default function HomePage() {
  return (
    <ShopCatalogPage
      config={{
        mode: 'all',
        title: 'WELCOME',
        searchPlaceholder: 'Search products...',
        showSocialProof: true,
        showFooterTagline: false,
        emptyVariant: 'simple',
      }}
    />
  )
}
