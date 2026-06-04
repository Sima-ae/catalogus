'use client'

import { useEffect, useState } from 'react'
import AdminPageShell from '@/components/admin/AdminPageShell'
import { useAppTheme } from '@/lib/theme-classes'
import StatCard from '@/components/admin/StatCard'
import { appPath } from '@/lib/paths'
import { useShopCurrency } from '@/lib/shop-currency-context'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import {
  BanknotesIcon,
  ShoppingCartIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'

type AdminAnalyticsSummary = {
  revenue: number
  orders: number
  products: number
  users: number
  vendors: number
  completedOrders: number
}

export default function AdminAnalyticsPage() {
  const t = useAppTheme()
  const { user } = useAuth()
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
    if (!user) return

    fetch(appPath('/api/admin/analytics'), { headers: adminAuthHeaders(user) })
      .then(async (r) => {
        const data = (await r.json()) as AdminAnalyticsSummary & { error?: string }
        if (!r.ok) throw new Error(data.error || 'Failed to load analytics')
        setStats({
          revenue: Number(data.revenue ?? 0),
          orders: Number(data.orders ?? 0),
          products: Number(data.products ?? 0),
          users: Number(data.users ?? 0),
          vendors: Number(data.vendors ?? 0),
          completedOrders: Number(data.completedOrders ?? 0),
        })
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [user])

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
