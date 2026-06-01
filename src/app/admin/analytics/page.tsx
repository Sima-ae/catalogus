'use client'

import { useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import { useAppTheme } from '@/lib/theme-classes'
import StatCard from '@/components/admin/StatCard'
import { appPath } from '@/lib/paths'
import { useShopCurrency } from '@/lib/shop-currency-context'
import {
  BanknotesIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

type Product = { id: string; price: number; author: string }
type Order = { id: string; total: number; status: string }
type UserRow = { id: string; role: string }

export default function AdminAnalyticsPage() {
  const t = useAppTheme()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    products: 0,
    users: 0,
    vendors: 0,
    completedOrders: 0,
  })

  useEffect(() => {
    Promise.all([
      fetch(appPath('/api/products')).then((r) => r.json()),
      fetch(appPath('/api/orders')).then((r) => r.json()),
      fetch(appPath('/api/users')).then((r) => r.json()),
    ])
      .then(([products, orders, users]) => {
        const productList = Array.isArray(products) ? (products as Product[]) : []
        const orderList = Array.isArray(orders) ? (orders as Order[]) : []
        const userList = Array.isArray(users) ? (users as UserRow[]) : []

        const revenue = orderList.reduce((sum, o) => sum + Number(o.total || 0), 0)
        const completedOrders = orderList.filter(
          (o) => o.status === 'completed' || o.status === 'paid'
        ).length
        const vendors = new Set(productList.map((p) => p.author).filter(Boolean)).size

        setStats({
          revenue,
          orders: orderList.length,
          products: productList.length,
          users: userList.length,
          vendors,
          completedOrders,
        })
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const { symbol: currency } = useShopCurrency()

  return (
    <AdminPageShell title="Analytics">
      {loading && <p className={t.muted}>Loading...</p>}
      {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total revenue"
              value={`${currency} ${stats.revenue.toFixed(2)}`}
              icon={<BanknotesIcon className="w-6 h-6 text-white" />}
              accentColor="bg-green-500"
            />
            <StatCard
              title="Orders"
              value={String(stats.orders)}
              icon={<ShoppingCartIcon className="w-6 h-6 text-white" />}
              accentColor="bg-purple-500"
            />
            <StatCard
              title="Products"
              value={String(stats.products)}
              icon={<ClipboardDocumentListIcon className="w-6 h-6 text-white" />}
              accentColor="bg-pink-500"
            />
            <StatCard
              title="Users"
              value={String(stats.users)}
              icon={<UsersIcon className="w-6 h-6 text-white" />}
              accentColor="bg-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="card-subtitle">Completed orders</h3>
              <p className={`text-3xl font-bold ${t.heading}`}>{stats.completedOrders}</p>
            </div>
            <div className="card">
              <h3 className="card-subtitle">Unique vendors</h3>
              <p className={`text-3xl font-bold ${t.heading}`}>{stats.vendors}</p>
            </div>
          </div>
        </>
      )}
    </AdminPageShell>
  )
}
