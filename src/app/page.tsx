import { headers } from 'next/headers'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import { buildShopCatalogSignature } from '@/lib/shop-catalog-ssr'
import { listShopCategoryNavTree } from '@/lib/products-db'
import { resolveStoreModeFromHeaders } from '@/lib/store-host'

export const dynamic = 'force-dynamic'

/**
 * Homepage: never SSR the product grid.
 * Client fetch keeps Super Clones + 1-1.club first paint light and avoids
 * competing with live RAND()/shuffle SQL under traffic (was a 503 source).
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const storeMode = resolveStoreModeFromHeaders(headers())
  const featuredOnly = storeMode === 'featured'
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'all', {
    shuffle: true,
  })

  const initialCategoryNav = await listShopCategoryNavTree({ featuredOnly }).catch(() => [])

  return (
    <ShopCatalogPage
      config={{
        mode: 'all',
        title: 'WELCOME',
        searchPlaceholder: 'Search products...',
        // Social-proof pool scans the full catalog — skip on featured hosts.
        showSocialProof: !featuredOnly,
        showFooterTagline: false,
        emptyVariant: 'simple',
        centerCatalog: true,
        shuffleCatalog: true,
        featuredStorefront: featuredOnly,
      }}
      initialCatalog={null}
      initialCatalogSignature={initialCatalogSignature}
      initialCategoryNav={initialCategoryNav}
    />
  )
}
