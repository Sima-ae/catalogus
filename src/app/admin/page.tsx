'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  PencilIcon,
  PlusIcon,
  ShoppingCartIcon,
  TagIcon,
  UsersIcon,
} from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import StatCard from '@/components/admin/StatCard'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from '@/components/admin/AdminTable'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { parseJsonResponse } from '@/lib/fetch-json'
import { formatPrice } from '@/lib/format-price'
import { useShopCurrency } from '@/lib/shop-currency-context'
import { appPath } from '@/lib/paths'
import { isCatalogProductsPage, type ProductDashboardStats } from '@/lib/catalog-products'
import { useAppTheme } from '@/lib/theme-classes'
import type { Product } from '@/lib/types'
import { useI18n } from '@/lib/i18n-context'

type Order = {
  id: string
  tracking_number?: string
  customer_email: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

type UserRow = { id: string; role: string }

const LATEST_PRODUCTS = 10
const RECENT_ORDERS = 5

function sortNewest<T extends { created_at?: string }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )
}

function formatWhen(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusBadge({ status }: { status: Product['status'] | string }) {
  const normalized = String(status || '').toLowerCase()
  const styles =
    normalized === 'active'
      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
      : normalized === 'draft'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
        : normalized === 'completed' || normalized === 'paid'
          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
          : normalized === 'pending'
            ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400'
            : normalized === 'processing'
              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
              : normalized === 'cancelled'
                ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                : 'bg-gray-500/15 text-gray-600 dark:text-gray-400'

  const label = normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '—'

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  )
}

const quickLinks = [
  { href: '/admin/products', label: 'Products', icon: CubeIcon },
  { href: '/admin/import', label: 'Yupoo import', icon: ArrowDownTrayIcon },
  { href: '/admin/import/review', label: 'Import review', icon: ClipboardDocumentListIcon },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCartIcon },
  { href: '/admin/categories', label: 'Categories', icon: TagIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
] as const

export default function AdminDashboard() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const { symbol: currency } = useShopCurrency()

  const [products, setProducts] = useState<Product[]>([])
  const [productStats, setProductStats] = useState<ProductDashboardStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const headers = adminAuthHeaders(user)
      const [latestRes, statsRes, ordersRes, usersRes] = await Promise.all([
        fetch(appPath('/api/products?page=1&limit=10&scope=admin'), { headers, cache: 'no-store' }),
        fetch(appPath('/api/products?page=1&limit=1&scope=admin'), { headers, cache: 'no-store' }),
        fetch(appPath('/api/orders'), { cache: 'no-store' }),
        fetch(appPath('/api/admin/users'), { headers, cache: 'no-store' }),
      ])

      const latestData = await parseJsonResponse<
        | { items?: Product[]; error?: string }
        | Product[]
      >(latestRes)
      if (!latestRes.ok) {
        throw new Error(
          !Array.isArray(latestData) && latestData.error
            ? latestData.error
            : 'Failed to load products'
        )
      }

      if (isCatalogProductsPage(latestData)) {
        setProducts(latestData.items)
      } else if (Array.isArray(latestData)) {
        setProducts(sortNewest(latestData).slice(0, LATEST_PRODUCTS))
      } else {
        throw new Error('Failed to load products')
      }

      if (statsRes.ok) {
        const statsData = await parseJsonResponse<
          | { dashboardStats?: ProductDashboardStats; error?: string }
          | Product[]
        >(statsRes)
        if (isCatalogProductsPage(statsData)) {
          setProductStats(statsData.dashboardStats ?? null)
        } else {
          setProductStats(null)
        }
      } else {
        setProductStats(null)
      }

      let ordersData: Order[] = []
      if (ordersRes.ok) {
        const parsed = await parseJsonResponse<Order[]>(ordersRes)
        if (Array.isArray(parsed)) ordersData = parsed
      }

      let usersData: UserRow[] = []
      if (usersRes.ok) {
        const parsed = await parseJsonResponse<UserRow[] | { error?: string }>(usersRes)
        if (Array.isArray(parsed)) usersData = parsed
      }

      setOrders(ordersData)
      setUserCount(usersData.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) loadDashboard()
  }, [user, loadDashboard])

  const stats = useMemo(() => {
    const active = productStats?.active ?? products.filter((p) => p.status === 'active').length
    const draft = productStats?.draft ?? products.filter((p) => p.status === 'draft').length
    const inactive = productStats?.inactive ?? products.filter((p) => p.status === 'inactive').length
    const catalogTotal = productStats?.total ?? active + draft + inactive
    const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0)
    const pendingOrders = orders.filter((o) => o.status === 'pending').length

    return {
      catalogTotal,
      active,
      draft,
      inactive,
      revenue,
      pendingOrders,
    }
  }, [productStats, products, orders])

  const latestProducts = useMemo(() => sortNewest(products).slice(0, LATEST_PRODUCTS), [products])

  const recentOrders = useMemo(() => sortNewest(orders).slice(0, RECENT_ORDERS), [orders])

  return (
    <AdminPageShell title="Dashboard">
      {error ? <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p> : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500 mx-auto" />
            <p className={`mt-3 text-sm ${t.muted}`}>{tr('loading.dashboard')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Catalog"
              value={stats.catalogTotal}
              change={`${stats.active} live · ${stats.draft} draft · ${stats.inactive} inactive`}
              icon={<CubeIcon className="w-6 h-6 text-white" />}
              accentColor="bg-pink-500"
            />
            <StatCard
              title="Orders"
              value={orders.length}
              change={
                stats.pendingOrders > 0
                  ? `${stats.pendingOrders} pending`
                  : orders.length
                    ? 'All caught up'
                    : 'No orders yet'
              }
              icon={<ShoppingCartIcon className="w-6 h-6 text-white" />}
              accentColor="bg-purple-500"
            />
            <StatCard
              title="Revenue"
              value={`${currency} ${stats.revenue.toFixed(2)}`}
              change="From all orders"
              icon={<BanknotesIcon className="w-6 h-6 text-white" />}
              accentColor="bg-green-500"
            />
            <StatCard
              title="Users"
              value={userCount}
              change="Registered accounts"
              icon={<UsersIcon className="w-6 h-6 text-white" />}
              accentColor="bg-blue-500"
            />
          </div>

          <section className="mb-8">
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${t.muted}`}>
              Quick actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={appPath(href)}
                  className={`card flex flex-col items-center justify-center gap-2 py-4 text-center text-sm font-medium transition-colors hover:ring-1 hover:ring-primary-500/40 ${t.tableCell}`}
                >
                  <Icon className="w-6 h-6 text-primary-500" aria-hidden />
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className={`text-lg font-semibold ${t.heading}`}>Latest products</h2>
                  <p className={`text-sm ${t.muted}`}>
                    Most recently added or updated — showing {latestProducts.length} of{' '}
                    {stats.catalogTotal}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={appPath('/admin/products')} className="btn-secondary text-sm">
                    View all
                  </Link>
                  <Link
                    href={appPath('/admin/products/new')}
                    className="btn-primary text-sm inline-flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add product
                  </Link>
                </div>
              </div>

              {latestProducts.length === 0 ? (
                <div className={`card text-center py-10 ${t.muted}`}>
                  <p className="mb-3">No products in the catalog yet.</p>
                  <Link href={appPath('/admin/products/new')} className="btn-primary text-sm">
                    Add your first product
                  </Link>
                </div>
              ) : (
                <AdminTable>
                  <AdminTableHead>
                    <AdminTh>Product</AdminTh>
                    <AdminTh>Category</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh>Added</AdminTh>
                    <AdminTh align="right"> </AdminTh>
                  </AdminTableHead>
                  <AdminTableBody>
                    {latestProducts.map((product) => (
                      <AdminTr key={product.id}>
                        <AdminTd>
                          <div className="flex items-center gap-3 min-w-0">
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt=""
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded object-cover shrink-0"
                                unoptimized
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded shrink-0 ${t.surfaceMuted}`}
                              />
                            )}
                            <div className="min-w-0">
                              <p className={`font-medium truncate max-w-[200px] sm:max-w-xs ${t.heading}`}>
                                {product.name}
                              </p>
                              {product.brand ? (
                                <p className={`text-xs truncate ${t.muted}`}>{product.brand}</p>
                              ) : null}
                            </div>
                          </div>
                        </AdminTd>
                        <AdminTd className="whitespace-nowrap">{product.category || '—'}</AdminTd>
                        <AdminTd>
                          <StatusBadge status={product.status} />
                        </AdminTd>
                        <AdminTd className={`text-xs whitespace-nowrap ${t.muted}`}>
                          {formatWhen(product.created_at)}
                        </AdminTd>
                        <AdminTd align="right">
                          <Link
                            href={appPath(`/admin/products/${product.id}/edit`)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.iconBtn}`}
                            title="Edit product"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                          </Link>
                        </AdminTd>
                      </AdminTr>
                    ))}
                  </AdminTableBody>
                </AdminTable>
              )}
            </section>

            <section>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className={`text-lg font-semibold ${t.heading}`}>Recent orders</h2>
                  <p className={`text-sm ${t.muted}`}>Last {RECENT_ORDERS} orders</p>
                </div>
                <Link href={appPath('/admin/orders')} className="btn-secondary text-sm">
                  View all
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className={`card text-center py-10 text-sm ${t.muted}`}>
                  No orders yet. They will appear here after customers checkout.
                </div>
              ) : (
                <div className="card divide-y divide-gray-200 dark:divide-dark-800">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${t.heading}`}>
                            {order.customer_name || 'Customer'}
                          </p>
                          <p className={`text-xs truncate ${t.muted}`}>{order.customer_email}</p>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className={`mt-2 flex items-center justify-between text-sm ${t.muted}`}>
                        <span>{formatWhen(order.created_at)}</span>
                        <span className={`font-semibold ${t.heading}`}>
                          {formatPrice(order.total)}
                        </span>
                      </div>
                      {order.tracking_number ? (
                        <p className={`text-xs mt-1 font-mono ${t.muted}`}>
                          {order.tracking_number}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </AdminPageShell>
  )
}
