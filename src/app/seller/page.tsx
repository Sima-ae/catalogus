'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { sellerNav } from '@/lib/seller-nav'
import { useAppTheme } from '@/lib/theme-classes'
import type { Product } from '@/lib/types'

export default function SellerDashboard() {
  const t = useAppTheme()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const loadProducts = useCallback(() => {
    if (!user) return
    fetch(appPath('/api/products?page=1&limit=100'), { headers: catalogAuthHeaders(user) })
      .then((r) => r.json())
      .then((data) => {
        if (isCatalogProductsPage(data)) setProducts(data.items)
        else setProducts(Array.isArray(data) ? data : [])
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return (
    <DashboardShell title="Seller Dashboard" nav={sellerNav}>
      <h2 className={`text-2xl font-bold mb-2 ${t.heading}`}>Welcome, {user?.name}</h2>
      <p className={`mb-6 ${t.muted}`}>Manage your listings and track sales.</p>
      <UserBadgeCard user={user} title="Your seller reputation" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6">
          <h3 className={`text-sm ${t.muted}`}>Your products</h3>
          <p className={`text-3xl font-bold mt-2 ${t.heading}`}>{products.length}</p>
          <Link
            href={appPath('/seller/products')}
            className={`text-sm mt-2 inline-block ${t.link}`}
          >
            Manage products →
          </Link>
        </div>
        <div className="card p-6">
          <h3 className={`text-sm ${t.muted}`}>Account</h3>
          <p className={`mt-2 capitalize font-medium ${t.heading}`}>{user?.role}</p>
          {user?.badge_rating != null && user.badge_rating > 0 && (
            <p className="text-amber-600 dark:text-amber-400 text-sm mt-2 font-medium">
              {user.badge_rating}★ marketplace badge
            </p>
          )}
        </div>
        <Link
          href={appPath('/')}
          className="card p-6 hover:border-primary-500 transition-colors block"
        >
          <h3 className={`font-semibold ${t.heading}`}>View storefront</h3>
          <p className={`text-sm mt-1 ${t.muted}`}>See how buyers see your shop</p>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h3 className={`text-lg font-semibold ${t.heading}`}>Your listings</h3>
        <Link
          href={appPath('/seller/products/new')}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <PlusIcon className="w-5 h-5" />
          Add product
        </Link>
      </div>

      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : products.length === 0 ? (
        <p className={t.muted}>
          No products listed yet.{' '}
          <Link href={appPath('/seller/products/new')} className={t.link}>
            Add your first product
          </Link>
        </p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Name</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Price</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh align="right">Actions</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {products.map((p) => (
              <AdminTr key={p.id}>
                <AdminTd>{p.name}</AdminTd>
                <AdminTd>{p.category || '—'}</AdminTd>
                <AdminTd>{formatPrice(p.price)}</AdminTd>
                <AdminTd className="capitalize">{p.status || 'active'}</AdminTd>
                <AdminTd align="right">
                  <Link
                    href={appPath(`/seller/products/${p.id}/edit`)}
                    className={`text-sm ${t.link}`}
                  >
                    Edit
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
