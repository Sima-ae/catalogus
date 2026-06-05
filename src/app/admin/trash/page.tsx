'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
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
import { buildAdminProductsUrl, isCatalogProductsPage } from '@/lib/catalog-products'
import { useI18n } from '@/lib/i18n-context'

const PAGE_SIZES = [50, 100, 250] as const
type PageSize = (typeof PAGE_SIZES)[number]

function PaginationBar({
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
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-1 ${t.rowBorder}`}
    >
      <p className={`text-sm ${t.muted}`}>
        {totalItems === 0 ? (
          'Trash is empty'
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

export default function AdminTrashPage() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [pageSize, setPageSize] = useState<PageSize>(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [working, setWorking] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, pageSize])

  const loadTrash = useCallback(() => {
    if (!user) return

    setLoading(true)
    setError('')

    const url =
      buildAdminProductsUrl(appPath('/api/products'), {
        page: currentPage,
        limit: pageSize,
        status: 'trash',
        search: debouncedSearch || undefined,
      }) + '&scope=admin'

    fetch(url, { headers: adminAuthHeaders(user), cache: 'no-store' })
      .then(async (res) => {
        const data = await parseJsonResponse<{ error?: string } | Product[]>(res)
        if (!res.ok) {
          throw new Error(
            !Array.isArray(data) && data.error ? data.error : 'Failed to load trash'
          )
        }
        if (!isCatalogProductsPage(data)) throw new Error('Invalid response')
        setProducts(data.items)
        setTotalItems(data.total)
        setSelected(new Set())
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
        setProducts([])
        setTotalItems(0)
      })
      .finally(() => setLoading(false))
  }, [user, currentPage, pageSize, debouncedSearch])

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  const selectedIds = Array.from(selected)
  const allOnPageSelected =
    products.length > 0 && products.every((p) => selected.has(p.id))

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllOnPage = () => {
    const pageIds = products.map((p) => p.id)
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

  const runPermanentDelete = async (ids: string[], skipConfirm = false) => {
    if (!user || !ids.length) return
    if (
      !skipConfirm &&
      !confirm(
        `Permanently delete ${ids.length} product(s)? This cannot be undone.`
      )
    ) {
      return
    }

    setWorking(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch(appPath('/api/admin/trash/permanent-delete'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: ids }),
      })
      const data = await parseJsonResponse<{ error?: string; deleted?: number }>(res)
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setSuccessMessage(
        `${data.deleted ?? ids.length} product(s) permanently deleted.`
      )
      loadTrash()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setWorking(false)
    }
  }

  const emptyTrash = async () => {
    if (!user || totalItems === 0) return
    if (
      !confirm(
        `Permanently delete all ${totalItems} product(s) in trash? This cannot be undone.`
      )
    ) {
      return
    }

    setWorking(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch(appPath('/api/admin/trash/empty'), {
        method: 'POST',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<{ error?: string; deleted?: number }>(res)
      if (!res.ok) throw new Error(data.error || 'Failed to empty trash')
      setSuccessMessage(`Trash emptied — ${data.deleted ?? 0} product(s) deleted.`)
      setCurrentPage(1)
      loadTrash()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to empty trash')
    } finally {
      setWorking(false)
    }
  }

  const restoreProducts = async (ids: string[]) => {
    if (!user || !ids.length) return
    if (!confirm(`Restore ${ids.length} product(s) to the shop?`)) return

    setWorking(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch(appPath('/api/admin/products/bulk-status'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: ids, status: 'active' }),
      })
      const data = await parseJsonResponse<{ error?: string; updated?: number }>(res)
      if (!res.ok) throw new Error(data.error || 'Restore failed')
      setSuccessMessage(`${data.updated ?? ids.length} product(s) restored.`)
      loadTrash()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed')
    } finally {
      setWorking(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage)
  }, [currentPage, safePage])

  return (
    <AdminPageShell title="Trash">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className={`text-sm max-w-xl ${t.muted}`}>
          Products moved to trash are hidden from the shop. Restore them or delete
          permanently — empty trash removes everything at once.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={appPath('/admin/products')} className="btn-secondary text-sm">
            All products
          </Link>
          <button
            type="button"
            className="btn-secondary text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10"
            disabled={working || loading || totalItems === 0}
            onClick={() => void emptyTrash()}
          >
            Empty trash
          </button>
        </div>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {successMessage && (
        <p className="text-green-600 dark:text-green-400 mb-4">{successMessage}</p>
      )}

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
          <label className="sm:w-32 space-y-1">
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
          <strong className={t.heading}>{totalItems}</strong> in trash
        </p>

        {selected.size > 0 && (
          <div className={`flex flex-wrap items-center gap-2 pt-3 border-t ${t.rowBorder}`}>
            <span className={`text-sm font-medium ${t.heading}`}>
              {selected.size} selected
            </span>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={working}
              onClick={() => restoreProducts(selectedIds)}
            >
              Restore to shop
            </button>
            <button
              type="button"
              className="text-sm px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
              disabled={working}
              onClick={() => runPermanentDelete(selectedIds)}
            >
              Delete permanently
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
        <p className={t.muted}>{tr('loading.products')}</p>
      ) : totalItems === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <TrashIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="mb-2">Trash is empty.</p>
          <p className="text-sm">Deleted products will appear here before permanent removal.</p>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="card rounded-b-none border-b-0 pb-0">
            <PaginationBar
              page={safePage}
              pageSize={pageSize}
              totalItems={totalItems}
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
              <AdminTh align="right">Actions</AdminTh>
            </AdminTableHead>
            <AdminTableBody>
              {products.map((p) => (
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
                  <AdminTd className="font-mono text-xs whitespace-nowrap">
                    {p.sku || '—'}
                  </AdminTd>
                  <AdminTd>{p.category || '—'}</AdminTd>
                  <AdminTd>{p.brand || '—'}</AdminTd>
                  <AdminTd>{formatPrice(p.price)}</AdminTd>
                  <AdminTd align="right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => restoreProducts([p.id])}
                        disabled={working}
                        className={`p-2 rounded-lg ${t.iconBtn}`}
                        title="Restore to shop"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => runPermanentDelete([p.id])}
                        disabled={working}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400"
                        title="Delete permanently"
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
            <PaginationBar
              page={safePage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              t={t}
            />
          </div>
        </div>
      )}
    </AdminPageShell>
  )
}
