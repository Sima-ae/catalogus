import { headers } from 'next/headers'
import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import {
  buildShopCatalogSignature,
  loadInitialShopCatalog,
  shouldServerRenderShopCatalog,
} from '@/lib/shop-catalog-ssr'
import { listShopCategoryNavTree } from '@/lib/products-db'
import { resolveStoreModeFromHeaders } from '@/lib/store-host'

export const dynamic = 'force-dynamic'

/**
 * Homepage: never SSR the shuffled Super Clones catalog (shuffle pool can be heavy).
 * Featured hosts (1-1.club): SSR the tiny featured page so first paint is instant.
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
    shuffle: !featuredOnly,
  })
  const shouldSsrCatalog = featuredOnly && shouldServerRenderShopCatalog(sp)

  const [initialCatalog, initialCategoryNav] = await Promise.all([
    shouldSsrCatalog
      ? loadInitialShopCatalog(sp, 'all', { featuredOnly: true }).catch(() => null)
      : Promise.resolve(null),
    listShopCategoryNavTree({ featuredOnly }).catch(() => []),
  ])

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
        shuffleCatalog: !featuredOnly,
        featuredStorefront: featuredOnly,
      }}
      initialCatalog={initialCatalog}
      initialCatalogSignature={initialCatalogSignature}
      initialCategoryNav={initialCategoryNav}
    />
  )
}
