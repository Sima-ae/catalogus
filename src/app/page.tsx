import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-ssr'

export const dynamic = 'force-dynamic'

/**
 * Homepage: never SSR the shuffled catalog. Shuffle queries (10k pool) were a major
 * MariaDB/CPU burn for any request that reached this page. Client fetch is fast with
 * the category listing indexes.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'all', { shuffle: true })

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
      initialCatalog={null}
      initialCatalogSignature={initialCatalogSignature}
    />
  )
}
