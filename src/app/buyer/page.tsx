'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { useAuth } from '@/lib/auth-local'
import type { Product } from '@/lib/types'
import { appPath } from '@/lib/paths'

const nav = [
  { name: 'Dashboard', href: '/buyer' },
  { name: 'Browse shop', href: '/' },
  { name: 'My cart', href: '/cart' },
]

export default function BuyerDashboard() {
  const { user } = useAuth()
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
      <h2 className="text-2xl font-bold text-white mb-2">Welcome, {user?.name}</h2>
      <p className="text-gray-400 mb-8">Browse products, manage your cart, and checkout.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link href="/" className="card p-6 hover:border-primary-500 transition-colors">
          <h3 className="text-white font-semibold">Shop</h3>
          <p className="text-gray-400 text-sm mt-1">View all products</p>
        </Link>
        <Link href="/cart" className="card p-6 hover:border-primary-500 transition-colors">
          <h3 className="text-white font-semibold">Cart</h3>
          <p className="text-gray-400 text-sm mt-1">Review items before checkout</p>
        </Link>
        <Link href="/checkout" className="card p-6 hover:border-primary-500 transition-colors">
          <h3 className="text-white font-semibold">Checkout</h3>
          <p className="text-gray-400 text-sm mt-1">Complete your purchase</p>
        </Link>
      </div>

      <h3 className="text-lg font-semibold text-white mb-4">Featured products</h3>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-400">No products available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Link key={p.id} href={`/product/${p.id}`} className="card p-4 block hover:border-primary-500">
              <p className="text-white font-medium line-clamp-1">{p.name}</p>
              <p className="text-primary-500 mt-2">€ {Number(p.price).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
