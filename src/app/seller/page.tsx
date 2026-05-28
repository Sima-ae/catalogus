'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { useAuth } from '@/lib/auth-local'
import type { Product } from '@/lib/types'

const nav = [
  { name: 'Dashboard', href: '/seller' },
  { name: 'Shop', href: '/' },
]

export default function SellerDashboard() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        const mine = list.filter(
          (p: Product) =>
            p.author?.toLowerCase() === user?.name?.toLowerCase() ||
            p.author?.toLowerCase().includes('triplezero')
        )
        setProducts(mine.length ? mine : list)
      })
      .finally(() => setLoading(false))
  }, [user?.name])

  return (
    <DashboardShell title="Seller Dashboard" nav={nav}>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome, {user?.name}</h2>
      <p className="text-gray-400 mb-8">Manage your listings and track sales.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <h3 className="text-gray-400 text-sm">Your products</h3>
          <p className="text-3xl font-bold text-white mt-2">{products.length}</p>
        </div>
        <div className="card p-6">
          <h3 className="text-gray-400 text-sm">Account</h3>
          <p className="text-white mt-2 capitalize">{user?.role}</p>
        </div>
        <Link href="/" className="card p-6 hover:border-primary-500 transition-colors">
          <h3 className="text-white font-semibold">View storefront</h3>
          <p className="text-gray-400 text-sm mt-1">See how buyers see your shop</p>
        </Link>
      </div>

      <h3 className="text-lg font-semibold text-white mb-4">Your listings</h3>
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : products.length === 0 ? (
        <p className="text-gray-400">No products listed yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left py-3 px-4 text-gray-400">Name</th>
                <th className="text-left py-3 px-4 text-gray-400">Category</th>
                <th className="text-left py-3 px-4 text-gray-400">Price</th>
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-dark-700">
                  <td className="py-3 px-4 text-white">{p.name}</td>
                  <td className="py-3 px-4 text-gray-300">{p.category}</td>
                  <td className="py-3 px-4 text-white">€ {Number(p.price).toFixed(2)}</td>
                  <td className="py-3 px-4 text-gray-300">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  )
}
