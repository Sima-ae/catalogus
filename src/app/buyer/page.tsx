'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/dashboard/DashboardShell'
import UserBadgeCard from '@/components/users/UserBadgeCard'
import { useAuth } from '@/lib/auth-local'
import type { Product } from '@/lib/types'
import { appPath } from '@/lib/paths'
import { isCatalogProductsPage } from '@/lib/catalog-products'
import { formatPrice } from '@/lib/format-price'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
import { filterBuyerNavKeys } from '@/lib/buyer-nav'

export default function BuyerDashboard() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { catalogMode } = useCatalogMode()
  const { user } = useAuth()
  const nav = useMemo(
    () => filterBuyerNavKeys(catalogMode).map((item) => ({ name: tr(item.key), href: item.href })),
    [catalogMode, tr]
  )
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(appPath('/api/products?page=1&limit=6'))
      .then((r) => r.json())
      .then((data) => {
        if (isCatalogProductsPage(data)) setProducts(data.items)
        else if (Array.isArray(data)) setProducts(data.slice(0, 6))
        else setProducts([])
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardShell title={tr('buyer.dashboard.title')} nav={nav}>
      <h2 className={`text-2xl font-bold mb-6 ${t.heading}`}>
        {formatMessage(tr('buyer.dashboard.welcome'), { name: user?.name ?? '' })}
      </h2>
      <UserBadgeCard user={user} />

      <div
        className={`grid grid-cols-1 gap-4 mb-8 ${
          catalogMode ? 'md:grid-cols-1 max-w-sm' : 'md:grid-cols-3'
        }`}
      >
        <Link href={appPath('/')} className="card p-6 hover:border-primary-500 transition-colors block">
          <h3 className={`font-semibold ${t.heading}`}>{tr('buyer.dashboard.shop')}</h3>
          <p className={`text-sm mt-1 ${t.muted}`}>{tr('buyer.dashboard.shopDesc')}</p>
        </Link>
        {!catalogMode && (
          <>
            <Link
              href={appPath('/cart')}
              className="card p-6 hover:border-primary-500 transition-colors block"
            >
              <h3 className={`font-semibold ${t.heading}`}>{tr('buyer.dashboard.cart')}</h3>
              <p className={`text-sm mt-1 ${t.muted}`}>{tr('buyer.dashboard.cartDesc')}</p>
            </Link>
            <Link
              href={appPath('/checkout')}
              className="card p-6 hover:border-primary-500 transition-colors block"
            >
              <h3 className={`font-semibold ${t.heading}`}>{tr('buyer.dashboard.checkout')}</h3>
              <p className={`text-sm mt-1 ${t.muted}`}>{tr('buyer.dashboard.checkoutDesc')}</p>
            </Link>
          </>
        )}
      </div>

      <h3 className={`text-lg font-semibold mb-4 ${t.heading}`}>
        {tr('buyer.dashboard.featuredProducts')}
      </h3>
      {loading ? (
        <p className={t.muted}>{tr('loading.generic')}</p>
      ) : products.length === 0 ? (
        <p className={t.muted}>{tr('buyer.dashboard.noProducts')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={appPath(`/product/${p.id}`)}
              className="card p-4 block hover:border-primary-500"
            >
              <p className={`font-medium line-clamp-1 ${t.heading}`}>{p.name}</p>
              <p className="text-primary-600 dark:text-primary-400 mt-2 font-medium">
                {formatPrice(p.price)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
