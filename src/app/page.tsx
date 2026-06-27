import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import {
  buildShopCatalogSignature,
  loadInitialShopCatalog,
} from '@/lib/shop-catalog-ssr'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'all', { shuffle: true })
  let initialCatalog = null
  try {
    initialCatalog = await loadInitialShopCatalog(sp, 'all', { shuffle: true })
  } catch {
    // Client-side fetch fallback if DB is unavailable during SSR.
  }

  return (
    <ShopCatalogPage
      config={{
        mode: 'all',
        title: 'WELCOME',
        searchPlaceholder: 'Search products...',
        showSocialProof: true,
        showFooterTagline: false,
        emptyVariant: 'simple',
        centerCatalog: true,
        shuffleCatalog: true,
      }}
      initialCatalog={initialCatalog}
      initialCatalogSignature={initialCatalogSignature}
    />
  )
}
