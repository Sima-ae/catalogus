'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import AdminPageShell from '@/components/admin/AdminPageShell'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from '@/components/admin/AdminTable'
import { useAuth } from '@/lib/auth-local'
import { useAppTheme } from '@/lib/theme-classes'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'
import { formatPrice } from '@/lib/format-price'
import { productImageSrc } from '@/lib/product-image-url'
import type { Product } from '@/lib/types'

export default function AdminImportReviewPage() {
  const t = useAppTheme()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [bulkPublishing, setBulkPublishing] = useState(false)
  const [error, setError] = useState('')

  const loadQueue = useCallback(() => {
    if (!user || !isAdmin) return

    setLoading(true)
    setError('')

    fetch(appPath('/api/admin/import/review'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
    })
      .then(async (r) => {
        const data = await parseJsonResponse<{ error?: string } | Product[]>(r)
        if (!r.ok) {
          throw new Error(!Array.isArray(data) && data.error ? data.error : 'Failed to load queue')
        }
        if (!Array.isArray(data)) throw new Error('Invalid response')
        setProducts(data)
        setSelected(new Set())
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => setLoading(false))
  }, [user, isAdmin])

  useEffect(() => {
    if (authLoading || !isAdmin || !user) return
    loadQueue()
  }, [authLoading, isAdmin, user, loadQueue])

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(products.map((p) => p.id)))
    }
  }

  const publishOne = async (productId: string) => {
    if (!user) return

    setPublishingId(productId)
    setError('')

    try {
      const res = await fetch(appPath(`/api/admin/import/review/${productId}/publish`), {
        method: 'POST',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      loadQueue()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishingId(null)
    }
  }

  const publishSelected = async () => {
    if (!user || selected.size === 0) return

    setBulkPublishing(true)
    setError('')

    try {
      const res = await fetch(appPath('/api/admin/import/review/bulk-publish'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: Array.from(selected) }),
      })
      const data = await parseJsonResponse<{ error?: string; published?: number }>(res)
      if (!res.ok) throw new Error(data.error || 'Bulk publish failed')
      loadQueue()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk publish failed')
    } finally {
      setBulkPublishing(false)
    }
  }

  if (!isAdmin) {
    return (
      <AdminPageShell title="Import review">
        <p className="text-red-400">Only admin users can view this page.</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell title="Import review">
      <div className="flex flex-wrap gap-3 mb-6">
        <Link href={appPath('/admin/import')} className="btn-secondary">
          Import sources
        </Link>
        {selected.size > 0 && (
          <button
            type="button"
            className="btn-primary"
            disabled={bulkPublishing}
            onClick={publishSelected}
          >
            {bulkPublishing ? 'Publishing...' : `Publish selected (${selected.size})`}
          </button>
        )}
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : products.length === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p>No draft imports waiting for review.</p>
        </div>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>
              <input
                type="checkbox"
                checked={selected.size === products.length && products.length > 0}
                onChange={toggleAll}
                aria-label="Select all"
              />
            </AdminTh>
            <AdminTh>Product</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Price</AdminTh>
            <AdminTh>Sizes</AdminTh>
            <AdminTh>Actions</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {products.map((product) => (
              <AdminTr key={product.id}>
                <AdminTd>
                  <input
                    type="checkbox"
                    checked={selected.has(product.id)}
                    onChange={() => toggleSelected(product.id)}
                    aria-label={`Select ${product.name}`}
                  />
                </AdminTd>
                <AdminTd>
                  <div className="flex items-center gap-3">
                    {product.image_url && (
                      <div className="relative w-12 h-12 shrink-0">
                        <Image
                          src={productImageSrc(product.image_url)}
                          alt=""
                          fill
                          className="object-cover rounded"
                          unoptimized
                        />
                      </div>
                    )}
                    <div>
                      <div className="font-medium line-clamp-2">{product.name}</div>
                      {product.source_url && (
                        <a
                          href={product.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs ${t.muted} hover:underline`}
                        >
                          View Yupoo album
                        </a>
                      )}
                    </div>
                  </div>
                </AdminTd>
                <AdminTd>{product.category || '—'}</AdminTd>
                <AdminTd>{formatPrice(product.price)}</AdminTd>
                <AdminTd className="text-sm">
                  {product.available_sizes?.length
                    ? product.available_sizes.join(', ')
                    : '—'}
                </AdminTd>
                <AdminTd>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={appPath(`/admin/products/${product.id}/edit`)}
                      className="btn-secondary text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={publishingId === product.id}
                      onClick={() => publishOne(product.id)}
                    >
                      {publishingId === product.id ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </AdminTd>
              </AdminTr>
            ))}
          </AdminTableBody>
        </AdminTable>
      )}
    </AdminPageShell>
  )
}
