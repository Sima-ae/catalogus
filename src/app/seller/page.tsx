'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'
import DashboardShell from '@/components/dashboard/DashboardShell'
import UserBadgeCard from '@/components/users/UserBadgeCard'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from '@/components/admin/AdminTable'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { formatPrice } from '@/lib/format-price'
import { appPath } from '@/lib/paths'
import { isCatalogProductsPage } from '@/lib/catalog-products'
import { sellerNavKeys } from '@/lib/seller-nav'
import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
import type { Product } from '@/lib/types'

function productStatusKey(status: string | undefined): string {
  const n = String(status || 'active').toLowerCase()
  if (n === 'draft') return 'adminProducts.status.draft'
  if (n === 'inactive') return 'adminProducts.status.inactive'
  if (n === 'trash') return 'adminProducts.status.trash'
  return 'adminProducts.status.published'
}

export default function SellerDashboard() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const nav = useMemo(
    () => sellerNavKeys.map((item) => ({ name: tr(item.key), href: item.href })),
    [tr]
  )
  const [products, setProducts] = useState<Product[]>([])
  const [productTotal, setProductTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadProducts = useCallback(() => {
    if (!user) return
    Promise.all([
      fetch(appPath('/api/products?page=1&limit=8'), { headers: catalogAuthHeaders(user) }).then(
        (r) => r.json()
      ),
      fetch(appPath('/api/products?page=1&limit=1'), { headers: catalogAuthHeaders(user) }).then(
        (r) => r.json()
      ),
    ])
      .then(([listData, countData]) => {
        if (isCatalogProductsPage(listData)) setProducts(listData.items)
        else setProducts(Array.isArray(listData) ? listData : [])
        if (isCatalogProductsPage(countData)) setProductTotal(countData.total)
        else setProductTotal(Array.isArray(countData) ? countData.length : 0)
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return (
    <DashboardShell title={tr('seller.dashboard.title')} nav={nav}>
      <h2 className={`text-2xl font-bold mb-6 ${t.heading}`}>
        {formatMessage(tr('seller.dashboard.welcome'), { name: user?.name ?? '' })}
      </h2>
      <UserBadgeCard user={user} title={tr('seller.dashboard.reputation')} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <h3 className={`text-sm ${t.muted}`}>{tr('seller.dashboard.yourProducts')}</h3>
          <p className={`text-3xl font-bold mt-2 ${t.heading}`}>{productTotal}</p>
          <Link
            href={appPath('/seller/products')}
            className={`text-sm mt-2 inline-block ${t.link}`}
          >
            {tr('seller.dashboard.manageProducts')}
          </Link>
        </div>
        <div className="card p-6">
          <h3 className={`text-sm ${t.muted}`}>{tr('seller.dashboard.account')}</h3>
          <p className={`mt-2 capitalize font-medium ${t.heading}`}>{user?.role}</p>
          {user?.badge_rating != null && user.badge_rating > 0 && (
            <p className="text-amber-600 dark:text-amber-400 text-sm mt-2 font-medium">
              {formatMessage(tr('seller.dashboard.badge'), { rating: user.badge_rating })}
            </p>
          )}
        </div>
        <Link
          href={appPath('/')}
          className="card p-6 hover:border-primary-500 transition-colors block"
        >
          <h3 className={`font-semibold ${t.heading}`}>{tr('seller.dashboard.viewStorefront')}</h3>
          <p className={`text-sm mt-1 ${t.muted}`}>{tr('seller.dashboard.storefrontDesc')}</p>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className={`text-lg font-semibold ${t.heading}`}>{tr('seller.dashboard.yourListings')}</h3>
        <Link
          href={appPath('/seller/products/new')}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <PlusIcon className="w-5 h-5" />
          {tr('seller.dashboard.addProduct')}
        </Link>
      </div>

      {loading ? (
        <p className={t.muted}>{tr('loading.generic')}</p>
      ) : products.length === 0 ? (
        <p className={t.muted}>
          {tr('seller.dashboard.noProducts')}{' '}
          <Link href={appPath('/seller/products/new')} className={t.link}>
            {tr('seller.dashboard.addFirstProduct')}
          </Link>
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>{tr('adminProducts.col.product')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.category')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.price')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.status')}</AdminTh>
            <AdminTh align="right">{tr('adminProducts.col.actions')}</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {products.map((p) => (
              <AdminTr key={p.id}>
                <AdminTd>{p.name}</AdminTd>
                <AdminTd>{p.category || '—'}</AdminTd>
                <AdminTd>{formatPrice(p.price)}</AdminTd>
                <AdminTd>{tr(productStatusKey(p.status))}</AdminTd>
                <AdminTd align="right">
                  <Link
                    href={appPath(`/seller/products/${p.id}/edit`)}
                    className={`text-sm ${t.link}`}
                  >
                    {tr('adminProducts.edit')}
                  </Link>
                </AdminTd>
              </AdminTr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </DashboardShell>
  )
}
