'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDownTrayIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CubeIcon,
  DocumentTextIcon,
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
import PricelistTargetSelector, { useAdminPricelistTargetSlug } from '@/components/admin/PricelistTargetSelector'
import { isCatalogProductsPage, type ProductDashboardStats } from '@/lib/catalog-products'
import { useAppTheme } from '@/lib/theme-classes'
import type { Product } from '@/lib/types'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'

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

function orderStatusKey(status: string): string {
  const n = status.toLowerCase()
  if (n === 'pending') return 'admin.orderStatus.pending'
  if (n === 'processing') return 'admin.orderStatus.processing'
  if (n === 'completed') return 'admin.orderStatus.completed'
  if (n === 'paid') return 'admin.orderStatus.paid'
  if (n === 'cancelled') return 'admin.orderStatus.cancelled'
  if (n === 'active') return 'adminProducts.status.published'
  if (n === 'draft') return 'adminProducts.status.draft'
  if (n === 'inactive') return 'adminProducts.status.inactive'
  if (n === 'trash') return 'adminProducts.status.trash'
  return 'admin.orderStatus.pending'
}

function StatusBadge({
  status,
  label,
}: {
  status: Product['status'] | string
  label: string
}) {
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

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {label}
    </span>
  )
}

const quickLinks = [
  { href: '/admin/products', labelKey: 'admin.nav.products', icon: CubeIcon },
  { href: '/admin/import', labelKey: 'admin.page.yupooImport', icon: ArrowDownTrayIcon },
  { href: '/admin/import/review', labelKey: 'admin.page.importReview', icon: ClipboardDocumentListIcon },
  { href: '/admin/orders', labelKey: 'admin.nav.orders', icon: ShoppingCartIcon },
  { href: '/admin/categories', labelKey: 'admin.nav.categories', icon: TagIcon },
  { href: '/admin/users', labelKey: 'admin.nav.users', icon: UsersIcon },
] as const

export default function AdminDashboard() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const pricelistTarget = useAdminPricelistTargetSlug()
  const { symbol: currency } = useShopCurrency()

  const [products, setProducts] = useState<Product[]>([])
  const [productStats, setProductStats] = useState<ProductDashboardStats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [orderCount, setOrderCount] = useState(0)
  const [orderRevenue, setOrderRevenue] = useState(0)
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError('')

    try {
      const headers = adminAuthHeaders(user)
      const [latestRes, ordersRes, ordersSummaryRes, usersRes] = await Promise.all([
        fetch(appPath('/api/products?page=1&limit=10&scope=admin'), { headers, cache: 'no-store' }),
        fetch(appPath(`/api/orders?limit=${RECENT_ORDERS}`), { cache: 'no-store' }),
        fetch(appPath('/api/orders?summary=1'), { cache: 'no-store' }),
        fetch(appPath('/api/admin/users?count=1'), { headers, cache: 'no-store' }),
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
        setProductStats(latestData.dashboardStats ?? null)
      } else if (Array.isArray(latestData)) {
        setProducts(sortNewest(latestData).slice(0, LATEST_PRODUCTS))
        setProductStats(null)
      } else {
        throw new Error('Failed to load products')
      }

      let ordersData: Order[] = []
      if (ordersRes.ok) {
        const parsed = await parseJsonResponse<Order[]>(ordersRes)
        if (Array.isArray(parsed)) ordersData = parsed
      }

      let orderTotal = ordersData.length
      let revenueTotal = ordersData.reduce((sum, o) => sum + Number(o.total || 0), 0)
      if (ordersSummaryRes.ok) {
        const summary = await parseJsonResponse<{
          orders?: number
          revenue?: number
          error?: string
        }>(ordersSummaryRes)
        if (typeof summary.orders === 'number') orderTotal = summary.orders
        if (typeof summary.revenue === 'number') revenueTotal = summary.revenue
      }

      let usersTotal = 0
      if (usersRes.ok) {
        const parsed = await parseJsonResponse<{ total?: number } | UserRow[]>(usersRes)
        if (parsed && typeof parsed === 'object' && 'total' in parsed && typeof parsed.total === 'number') {
          usersTotal = parsed.total
        } else if (Array.isArray(parsed)) {
          usersTotal = parsed.length
        }
      }

      setOrders(ordersData)
      setUserCount(usersTotal)
      setOrderCount(orderTotal)
      setOrderRevenue(revenueTotal)
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('admin.dashboard.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [user, tr])

  useEffect(() => {
    if (user) loadDashboard()
  }, [user, loadDashboard])

  const stats = useMemo(() => {
    const active = productStats?.active ?? products.filter((p) => p.status === 'active').length
    const draft = productStats?.draft ?? products.filter((p) => p.status === 'draft').length
    const inactive = productStats?.inactive ?? products.filter((p) => p.status === 'inactive').length
    const trash = productStats?.trash ?? products.filter((p) => p.status === 'trash').length
    const catalogTotal = productStats?.total ?? active + draft + inactive
    const pendingOrders = orders.filter((o) => o.status === 'pending').length

    return {
      catalogTotal,
      active,
      draft,
      inactive,
      trash,
      revenue: orderRevenue,
      pendingOrders,
    }
  }, [productStats, products, orders, orderRevenue])

  const latestProducts = useMemo(() => sortNewest(products).slice(0, LATEST_PRODUCTS), [products])

  const recentOrders = useMemo(() => sortNewest(orders).slice(0, RECENT_ORDERS), [orders])

  return (
    <AdminPageShell>
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
              title={tr('admin.dashboard.statCatalog')}
              value={stats.catalogTotal}
              change={formatMessage(tr('admin.dashboard.catalogSummary'), {
                active: stats.active,
                draft: stats.draft,
                inactive: stats.inactive,
                trash: stats.trash
                  ? formatMessage(tr('admin.dashboard.trashSuffix'), { trash: stats.trash })
                  : '',
              })}
              icon={<CubeIcon className="w-6 h-6 text-white" />}
              accentColor="bg-pink-500"
            />
            <StatCard
              title={tr('admin.dashboard.statOrders')}
              value={orderCount}
              change={
                stats.pendingOrders > 0
                  ? formatMessage(tr('admin.dashboard.ordersPending'), {
                      count: stats.pendingOrders,
                    })
                  : orderCount
                    ? tr('admin.dashboard.ordersCaughtUp')
                    : tr('admin.dashboard.noOrdersYet')
              }
              icon={<ShoppingCartIcon className="w-6 h-6 text-white" />}
              accentColor="bg-purple-500"
            />
            <StatCard
              title={tr('admin.dashboard.statRevenue')}
              value={`${currency} ${stats.revenue.toFixed(2)}`}
              change={tr('admin.dashboard.fromAllOrders')}
              icon={<BanknotesIcon className="w-6 h-6 text-white" />}
              accentColor="bg-green-500"
            />
            <StatCard
              title={tr('admin.dashboard.statUsers')}
              value={userCount}
              change={tr('admin.dashboard.registeredAccounts')}
              icon={<UsersIcon className="w-6 h-6 text-white" />}
              accentColor="bg-blue-500"
            />
          </div>

          <section className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
              <h2 className={`text-sm font-semibold uppercase tracking-wide ${t.muted}`}>
                {tr('admin.quickActions')}
              </h2>
              <PricelistTargetSelector compact label="Target pricelist" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {quickLinks.map(({ href, labelKey, icon: Icon }) => (
                <Link
                  key={href}
                  href={appPath(href)}
                  className={`card flex flex-col items-center justify-center gap-2 py-4 text-center text-sm font-medium transition-colors hover:ring-1 hover:ring-primary-500/40 ${t.tableCell}`}
                >
                  <Icon className="w-6 h-6 text-primary-500" aria-hidden />
                  {tr(labelKey)}
                </Link>
              ))}
              <Link
                href={appPath(`/pricelist?owner=${encodeURIComponent(pricelistTarget)}`)}
                target="_blank"
                rel="noopener noreferrer"
                className={`card flex flex-col items-center justify-center gap-2 py-4 text-center text-sm font-medium transition-colors hover:ring-1 hover:ring-primary-500/40 ${t.tableCell}`}
              >
                <DocumentTextIcon className="w-6 h-6 text-primary-500" aria-hidden />
                {tr('admin.nav.pricelist')}
              </Link>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className={`text-lg font-semibold ${t.heading}`}>
                    {tr('admin.dashboard.latestProducts')}
                  </h2>
                  <p className={`text-sm ${t.muted}`}>
                    {formatMessage(tr('admin.dashboard.latestProductsHint'), {
                      shown: latestProducts.length,
                      total: stats.catalogTotal,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={appPath('/admin/products')} className="btn-secondary text-sm">
                    {tr('admin.dashboard.viewAll')}
                  </Link>
                  <Link
                    href={appPath('/admin/products/new')}
                    className="btn-primary text-sm inline-flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-4 h-4" />
                    {tr('admin.products.addProduct')}
                  </Link>
                </div>
              </div>

              {latestProducts.length === 0 ? (
                <div className={`card text-center py-10 ${t.muted}`}>
                  <p className="mb-3">{tr('admin.dashboard.noProductsYet')}</p>
                  <Link href={appPath('/admin/products/new')} className="btn-primary text-sm">
                    {tr('admin.products.addFirstProduct')}
                  </Link>
                </div>
              ) : (
                <AdminTable>
                  <AdminTableHead>
                    <AdminTh>{tr('adminProducts.col.product')}</AdminTh>
                    <AdminTh>{tr('adminProducts.col.category')}</AdminTh>
                    <AdminTh>{tr('adminProducts.col.status')}</AdminTh>
                    <AdminTh>{tr('admin.dashboard.colAdded')}</AdminTh>
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
                          <StatusBadge
                            status={product.status}
                            label={tr(orderStatusKey(product.status || 'active'))}
                          />
                        </AdminTd>
                        <AdminTd className={`text-xs whitespace-nowrap ${t.muted}`}>
                          {formatWhen(product.created_at)}
                        </AdminTd>
                        <AdminTd align="right">
                          <Link
                            href={appPath(`/admin/products/${product.id}/edit`)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.iconBtn}`}
                            title={tr('admin.dashboard.editProduct')}
                          >
                            <PencilIcon className="w-4 h-4" />
                            {tr('adminProducts.edit')}
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
                  <h2 className={`text-lg font-semibold ${t.heading}`}>
                    {tr('admin.dashboard.recentOrders')}
                  </h2>
                  <p className={`text-sm ${t.muted}`}>
                    {formatMessage(tr('admin.dashboard.recentOrdersHint'), {
                      count: RECENT_ORDERS,
                    })}
                  </p>
                </div>
                <Link href={appPath('/admin/orders')} className="btn-secondary text-sm">
                  {tr('admin.dashboard.viewAll')}
                </Link>
              </div>

              {recentOrders.length === 0 ? (
                <div className={`card text-center py-10 text-sm ${t.muted}`}>
                  {tr('admin.dashboard.noOrdersHint')}
                </div>
              ) : (
                <div className="card divide-y divide-gray-200 dark:divide-dark-800">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className={`font-medium truncate ${t.heading}`}>
                            {order.customer_name || tr('admin.dashboard.customer')}
                          </p>
                          <p className={`text-xs truncate ${t.muted}`}>{order.customer_email}</p>
                        </div>
                        <StatusBadge
                          status={order.status}
                          label={tr(orderStatusKey(order.status))}
                        />
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
