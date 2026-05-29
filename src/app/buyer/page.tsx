'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/dashboard/DashboardShell'
import UserBadgeCard from '@/components/users/UserBadgeCard'
import { useAuth } from '@/lib/auth-local'
import type { Product } from '@/lib/types'
import { appPath } from '@/lib/paths'
import { formatPrice } from '@/lib/format-price'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useAppTheme } from '@/lib/theme-classes'

const baseNav = [
  { name: 'Dashboard', href: '/buyer' },
  { name: 'Browse shop', href: '/' },
  { name: 'My cart', href: '/cart' },
]

export default function BuyerDashboard() {
  const t = useAppTheme()
  const { catalogMode } = useCatalogMode()
  const { user } = useAuth()
  const nav = catalogMode
    ? baseNav.filter((item) => item.href !== '/cart')
    : baseNav
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(appPath('/api/products'))
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data.slice(0, 6) : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardShell title="Buyer Dashboard" nav={nav}>
      <h2 className={`text-2xl font-bold mb-2 ${t.heading}`}>Welcome, {user?.name}</h2>
      <p className={`mb-6 ${t.muted}`}>
        {catalogMode
          ? 'Browse products in catalog mode.'
          : 'Browse products, manage your cart, and checkout.'}
      </p>
      <UserBadgeCard user={user} />

      <div
        className={`grid grid-cols-1 gap-4 mb-8 ${
          catalogMode ? 'md:grid-cols-1 max-w-sm' : 'md:grid-cols-3'
        }`}
      >
        <Link href={appPath('/')} className="card p-6 hover:border-primary-500 transition-colors block">
          <h3 className={`font-semibold ${t.heading}`}>Shop</h3>
          <p className={`text-sm mt-1 ${t.muted}`}>View all products</p>
        </Link>
        {!catalogMode && (
          <>
            <Link
              href={appPath('/cart')}
              className="card p-6 hover:border-primary-500 transition-colors block"
            >
              <h3 className={`font-semibold ${t.heading}`}>Cart</h3>
              <p className={`text-sm mt-1 ${t.muted}`}>Review items before checkout</p>
            </Link>
            <Link
              href={appPath('/checkout')}
              className="card p-6 hover:border-primary-500 transition-colors block"
            >
              <h3 className={`font-semibold ${t.heading}`}>Checkout</h3>
              <p className={`text-sm mt-1 ${t.muted}`}>Complete your purchase</p>
            </Link>
          </>
        )}
      </div>

      <h3 className={`text-lg font-semibold mb-4 ${t.heading}`}>Featured products</h3>
      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : products.length === 0 ? (
        <p className={t.muted}>No products available yet.</p>
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
