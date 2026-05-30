'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CubeIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  NoSymbolIcon,
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
import { useAppTheme } from '@/lib/theme-classes'
import { formatPrice } from '@/lib/format-price'
import type { Product } from '@/lib/types'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'

type StatusFilter = 'all' | 'active' | 'draft' | 'inactive'

const PAGE_SIZES = [50, 100, 250, 500] as const
type PageSize = (typeof PAGE_SIZES)[number]

function ProductsPaginationBar({
  page,
  pageSize,
  totalItems,
  onPageChange,
  t,
}: {
  page: number
  pageSize: PageSize
  totalItems: number
  onPageChange: (page: number) => void
  t: ReturnType<typeof useAppTheme>
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalItems)

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-1 border-b sm:border-b-0 ${t.rowBorder}`}
    >
      <p className={`text-sm ${t.muted}`}>
        {totalItems === 0 ? (
          'No products on this page'
        ) : (
          <>
            Showing <strong className={t.heading}>{start}</strong>–
            <strong className={t.heading}>{end}</strong> of{' '}
            <strong className={t.heading}>{totalItems}</strong>
            {totalPages > 1 && (
              <>
                {' '}
                · page <strong className={t.heading}>{safePage}</strong> of{' '}
                <strong className={t.heading}>{totalPages}</strong>
              </>
            )}
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={safePage >= totalPages || totalItems === 0}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}

function statusLabel(status: string): string {
  if (status === 'active') return 'Published'
  if (status === 'draft') return 'Draft'
  if (status === 'inactive') return 'Inactive'
  return status
}

function statusBadgeClass(status: string, isDark: boolean): string {
  if (status === 'active') {
    return isDark
      ? 'bg-green-500/15 text-green-400 border-green-500/30'
      : 'bg-green-50 text-green-800 border-green-200'
  }
  if (status === 'draft') {
    return isDark
      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      : 'bg-amber-50 text-amber-800 border-amber-200'
  }
  if (status === 'inactive') {
    return isDark
      ? 'bg-gray-500/15 text-gray-400 border-gray-500/30'
      : 'bg-gray-100 text-gray-600 border-gray-200'
  }
  return isDark ? 'bg-dark-800 text-gray-300' : 'bg-gray-100 text-gray-700'
}

export default function AdminProductsPage() {
  const t = useAppTheme()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [pageSize, setPageSize] = useState<PageSize>(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)

  const loadProducts = useCallback(() => {
    if (!user) return

    setLoading(true)
    setError('')

    fetch(appPath('/api/products'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
    })
      .then(async (r) => {
        const data = await parseJsonResponse<{ error?: string } | Product[]>(r)
        if (!r.ok) {
          throw new Error(!Array.isArray(data) && data.error ? data.error : 'Failed to load products')
        }
        if (!Array.isArray(data)) throw new Error('Invalid response')
        setProducts(data)
        setSelected(new Set())
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, pageSize])

  const stats = useMemo(() => {
    const total = products.length
    const active = products.filter((p) => p.status === 'active').length
    const draft = products.filter((p) => p.status === 'draft').length
    const inactive = products.filter((p) => p.status === 'inactive').length
    return { total, active, draft, inactive }
  }, [products])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      const sku = (p.sku || '').toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q) ||
        sku.includes(q)
      )
    })
  }, [products, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1)
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage)
  }, [currentPage, safePage])

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safePage, pageSize])

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllOnPage = () => {
    const pageIds = pageItems.map((p) => p.id)
    const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
    if (allOnPageSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const id of pageIds) next.delete(id)
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        for (const id of pageIds) next.add(id)
        return next
      })
    }
  }

  const selectAllFiltered = () => {
    setSelected(new Set(filtered.map((p) => p.id)))
  }

  const runBulkStatus = async (status: 'active' | 'draft' | 'inactive', ids: string[]) => {
    if (!user || !ids.length) return

    const label = statusLabel(status)
    if (!confirm(`Set ${ids.length} product(s) to "${label}"?`)) return

    setBulkWorking(true)
    setError('')

    try {
      const res = await fetch(appPath('/api/admin/products/bulk-status'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: ids, status }),
      })
      const data = await parseJsonResponse<{ error?: string; updated?: number }>(res)
      if (!res.ok) throw new Error(data.error || 'Bulk update failed')
      loadProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk update failed')
    } finally {
      setBulkWorking(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Delete this product?')) return
    void runBulkDelete([id], true)
  }

  const runBulkDelete = async (ids: string[], skipConfirm = false) => {
    if (!user || !ids.length) return
    if (
      !skipConfirm &&
      !confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)
    ) {
      return
    }

    setBulkWorking(true)
    setError('')

    try {
      const res = await fetch(appPath('/api/admin/products/bulk-delete'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: ids }),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Bulk delete failed')
      loadProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete failed')
    } finally {
      setBulkWorking(false)
    }
  }

  const publishAllDrafts = () => {
    const draftIds = products.filter((p) => p.status === 'draft').map((p) => p.id)
    if (!draftIds.length) return
    void runBulkStatus('active', draftIds)
  }

  const selectedIds = Array.from(selected)
  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((p) => selected.has(p.id))
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id))

  return (
    <AdminPageShell
      title="Products"
      description="Manage your full catalog. Use bulk actions to publish drafts or update many products at once."
    >
      <div className="flex flex-wrap items-center justify-end gap-3 mb-6">
        {stats.draft > 0 && (
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={bulkWorking || loading}
            onClick={publishAllDrafts}
          >
            Publish all drafts ({stats.draft})
          </button>
        )}
        <Link href={appPath('/admin/products/new')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add product
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Total products"
          value={stats.total}
          icon={<CubeIcon className="w-6 h-6 text-white" />}
          accentColor="bg-primary-500"
        />
        <StatCard
          title="Published"
          value={stats.active}
          icon={<CheckCircleIcon className="w-6 h-6 text-white" />}
          accentColor="bg-green-500"
        />
        <StatCard
          title="Draft"
          value={stats.draft}
          icon={<DocumentTextIcon className="w-6 h-6 text-white" />}
          accentColor="bg-amber-500"
        />
        <StatCard
          title="Inactive"
          value={stats.inactive}
          icon={<NoSymbolIcon className="w-6 h-6 text-white" />}
          accentColor="bg-gray-500"
        />
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <div className="card mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex-1 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>Search</span>
            <input
              type="search"
              className="input w-full"
              placeholder="Name, SKU, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="sm:w-44 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>Status</span>
            <select
              className="input w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="active">Published</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="sm:w-36 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>Per page</span>
            <select
              className="input w-full"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className={`text-sm ${t.muted}`}>
          <strong className={t.heading}>{filtered.length}</strong> matching ·{' '}
          <strong className={t.heading}>{stats.total}</strong> total in catalog
          {statusFilter !== 'all' && (
            <> · status: {statusLabel(statusFilter)}</>
          )}
        </p>

        {selected.size > 0 && (
          <div
            className={`flex flex-wrap items-center gap-2 pt-3 border-t ${t.rowBorder}`}
          >
            <span className={`text-sm font-medium ${t.heading}`}>
              {selected.size} selected
            </span>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={bulkWorking}
              onClick={() => runBulkStatus('active', selectedIds)}
            >
              Publish
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={bulkWorking}
              onClick={() => runBulkStatus('draft', selectedIds)}
            >
              Set draft
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={bulkWorking}
              onClick={() => runBulkStatus('inactive', selectedIds)}
            >
              Set inactive
            </button>
            <button
              type="button"
              className="text-sm px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              disabled={bulkWorking}
              onClick={() => runBulkDelete(selectedIds)}
            >
              Delete
            </button>
            <button
              type="button"
              className={`text-sm ${t.muted} hover:underline ml-auto`}
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className={t.muted}>Loading products...</p>
      ) : products.length === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p className="mb-4">No products yet.</p>
          <Link href={appPath('/admin/products/new')} className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add your first product
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p>No products match your search or filter.</p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="card rounded-b-none border-b-0 pb-0">
            <ProductsPaginationBar
              page={safePage}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              t={t}
            />
          </div>
          <AdminTable>
          <AdminTableHead>
            <AdminTh>
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleAllOnPage}
                aria-label="Select all on this page"
                className="rounded border-gray-400"
              />
            </AdminTh>
            <AdminTh>Product</AdminTh>
            <AdminTh>SKU</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Brand</AdminTh>
            <AdminTh>Price</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh align="right">Actions</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {pageItems.map((p) => (
              <AdminTr key={p.id}>
                <AdminTd>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                    aria-label={`Select ${p.name}`}
                    className="rounded border-gray-400"
                  />
                </AdminTd>
                <AdminTd>
                  <div className="flex items-center gap-3 min-w-[12rem]">
                    {p.image_url ? (
                      <Image
                        src={p.image_url}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded object-cover shrink-0 bg-gray-100"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-200 dark:bg-dark-700 shrink-0" />
                    )}
                    <span className="font-medium line-clamp-2">{p.name}</span>
                  </div>
                </AdminTd>
                <AdminTd className="font-mono text-xs whitespace-nowrap">{p.sku || '—'}</AdminTd>
                <AdminTd>{p.category || '—'}</AdminTd>
                <AdminTd>{p.brand || '—'}</AdminTd>
                <AdminTd>{formatPrice(p.price)}</AdminTd>
                <AdminTd>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${statusBadgeClass(p.status, t.isDark)}`}
                  >
                    {statusLabel(p.status || 'active')}
                  </span>
                </AdminTd>
                <AdminTd align="right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={appPath(`/admin/products/${p.id}/edit`)}
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
          <div className="card rounded-t-none border-t-0 pt-0">
            <ProductsPaginationBar
              page={safePage}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              t={t}
            />
            {filtered.length > pageItems.length && !allFilteredSelected && (
              <p className={`text-center text-sm pb-3 ${t.muted}`}>
                <button
                  type="button"
                  className="hover:underline"
                  onClick={selectAllFiltered}
                >
                  Select all {filtered.length} matching products
                </button>
              </p>
            )}
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
