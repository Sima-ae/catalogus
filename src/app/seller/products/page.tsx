'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { sellerNav } from '@/lib/seller-nav'
import { useAppTheme } from '@/lib/theme-classes'
import type { Product } from '@/lib/types'

export default function SellerProductsPage() {
  const t = useAppTheme()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProducts = useCallback(() => {
    if (!user) return
    setLoading(true)
    setError(null)
    fetch(appPath('/api/products'), { headers: catalogAuthHeaders(user) })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'Failed to load products')
        }
        setProducts(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setProducts([])
        setError(err instanceof Error ? err.message : 'Failed to load products')
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Delete this product?')) return
    const res = await fetch(appPath(`/api/products/${id}`), {
      method: 'DELETE',
      headers: catalogAuthHeaders(user),
    })
    if (res.ok) loadProducts()
    else {
      const data = await res.json().catch(() => ({}))
      alert(typeof data.error === 'string' ? data.error : 'Could not delete product')
    }
  }

  return (
    <DashboardShell title="My products" nav={sellerNav}>
      <div className="flex flex-wrap items-center justify-end gap-4 mb-6">
        <Link href={appPath('/seller/products/new')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add product
        </Link>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : products.length === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p className="mb-4">No products yet.</p>
          <Link
            href={appPath('/seller/products/new')}
            className="btn-primary inline-flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Add your first product
          </Link>
        </div>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Product</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Price</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh align="right">Actions</AdminTh>
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
                <AdminTd className="capitalize">{p.status || 'active'}</AdminTd>
                <AdminTd align="right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={appPath(`/seller/products/${p.id}/edit`)}
                      className={`p-2 rounded-lg ${t.iconBtn}`}
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </AdminTd>
              </AdminTr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </DashboardShell>
  )
}
