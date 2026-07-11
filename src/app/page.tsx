import ShopCatalogPage from '@/components/shop/ShopCatalogPage'
import {
  buildShopCatalogSignature,
  loadInitialShopCatalog,
} from '@/lib/shop-catalog-ssr'
import { listShopCategoryNavTree } from '@/lib/products-db'
import type { ShopCategoryNavNode } from '@/lib/shop-category-nav'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const initialCatalogSignature = buildShopCatalogSignature(sp, 'all', { shuffle: true })
  let initialCatalog = null
  let initialCategoryNav: ShopCategoryNavNode[] | null = null
  try {
    const [catalogResult, navResult] = await Promise.all([
      Promise.race([
        loadInitialShopCatalog(sp, 'all', { shuffle: true }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 12_000)),
      ]),
      Promise.race([
        listShopCategoryNavTree(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
      ]),
    ])
    initialCatalog = catalogResult
    initialCategoryNav = navResult
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
      initialCategoryNav={initialCategoryNav}
    />
  )
}
