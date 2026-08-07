import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-ssr'
import { listShopCategoryNavTree } from '@/lib/products-db'

export const dynamic = 'force-dynamic'

/**
 * Homepage: never SSR the shuffled catalog (shuffle pool can be heavy).
 * Do SSR the category nav tree so sidebar + pills paint immediately.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'all', { shuffle: true })
  const initialCategoryNav = await listShopCategoryNavTree().catch(() => [])

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
      initialCategoryNav={initialCategoryNav}
    />
  )
}
