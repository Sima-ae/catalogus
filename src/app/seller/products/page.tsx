'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import DashboardShell from '@/components/dashboard/DashboardShell'
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

const PAGE_SIZE = 50

function productStatusKey(status: string | undefined): string {
  const n = String(status || 'active').toLowerCase()
  if (n === 'draft') return 'adminProducts.status.draft'
  if (n === 'inactive') return 'adminProducts.status.inactive'
  if (n === 'trash') return 'adminProducts.status.trash'
  return 'adminProducts.status.published'
}

export default function SellerProductsPage() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const nav = useMemo(
    () => sellerNavKeys.map((item) => ({ name: tr(item.key), href: item.href })),
    [tr]
  )
  const [products, setProducts] = useState<Product[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    fetch(appPath(`/api/products?page=${currentPage}&limit=${PAGE_SIZE}`), {
      headers: catalogAuthHeaders(user),
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : tr('seller.products.loadFailed'))
        }
        if (isCatalogProductsPage(data)) {
          setProducts(data.items)
          setTotalItems(data.total)
        } else {
          setProducts(Array.isArray(data) ? data : [])
          setTotalItems(Array.isArray(data) ? data.length : 0)
        }
      })
      .catch((err) => {
        setProducts([])
        setTotalItems(0)
        setError(err instanceof Error ? err.message : tr('seller.products.loadFailed'))
      })
      .finally(() => setLoading(false))
  }, [user, currentPage, tr])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE) || 1)
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  const handleDelete = async (id: string) => {
    if (!user || !confirm(tr('seller.products.confirmDelete'))) return
    const res = await fetch(appPath(`/api/products/${id}`), {
      method: 'DELETE',
      headers: catalogAuthHeaders(user),
    })
    if (res.ok) loadProducts()
    else {
      const data = await res.json().catch(() => ({}))
      alert(typeof data.error === 'string' ? data.error : tr('seller.products.deleteFailed'))
    }
  }

  return (
    <DashboardShell title={tr('seller.products.title')} nav={nav}>
      <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
        <Link href={appPath('/seller/products/new')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          {tr('seller.dashboard.addProduct')}
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className={t.muted}>{tr('loading.generic')}</p>
      ) : totalItems === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p className="mb-4">{tr('seller.products.noProducts')}</p>
          <Link
            href={appPath('/seller/products/new')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            {tr('seller.dashboard.addFirstProduct')}
          </Link>
        </div>
      ) : (
        <>
          <p className={`text-sm mb-3 ${t.muted}`}>
            {formatMessage(tr('seller.products.count'), { count: totalItems })}
            {totalPages > 1 && (
              <>
                {' '}
                · {formatMessage(tr('pagination.pagePart'), {
                  page: safePage,
                  totalPages,
                }).trim()}
              </>
            )}
          </p>
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
                  <AdminTd>
                    <div className="flex items-center gap-3">
                      <Image
                        src={p.image_url}
                        alt={p.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded object-cover"
                        unoptimized
                      />
                      <span className="font-medium">{p.name}</span>
                    </div>
                  </AdminTd>
                  <AdminTd>{p.category || '—'}</AdminTd>
                  <AdminTd>{formatPrice(p.price)}</AdminTd>
                  <AdminTd>{tr(productStatusKey(p.status))}</AdminTd>
                  <AdminTd align="right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={appPath(`/seller/products/${p.id}/edit`)}
                        className={`p-2 rounded-lg ${t.iconBtn}`}
                        title={tr('adminProducts.edit')}
                      >
                        <PencilIcon className="w-5 h-5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400"
                        title={tr('adminProducts.delete')}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminTable>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(safePage - 1)}
              >
                {tr('pagination.previous')}
              </button>
              <button
                type="button"
                className="btn-secondary text-sm"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(safePage + 1)}
              >
                {tr('pagination.next')}
              </button>
            </div>
          )}
        </>
      )}
    </DashboardShell>
  )
}
