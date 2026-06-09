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
import { productImageSrc } from '@/lib/product-image-url'
import type { Product } from '@/lib/types'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'
import {
  buildAdminProductsUrl,
  isCatalogProductsPage,
  type ProductDashboardStats,
} from '@/lib/catalog-products'
import { buildCategoryPickerOptions, type CategoryPickerOption } from '@/lib/category-picker'
import AdminBulkEditModal, { type BulkEditPayload } from '@/components/admin/AdminBulkEditModal'
import ProductLabelPill from '@/components/admin/ProductLabelPill'
import CatalogPagination from '@/components/shop/CatalogPagination'
import { getCategoryPickerLabel, getTopCategoryLabel } from '@/lib/i18n-categories'
import { getTagLabel } from '@/lib/i18n-tags'
import { parseBrandCompound, parseCategoryCompound, resolveCategoryOptionFromSegment } from '@/lib/product-taxonomy'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'

type StatusFilter = 'all' | 'active' | 'draft' | 'inactive' | 'trash'

function formatAdminProductCategoryLabels(
  product: Product,
  categories: CategoryPickerOption[],
  tr: (key: string) => string
): string[] {
  if (product.category_id) {
    const match = categories.find((c) => c.id === product.category_id)
    if (match) {
      return [getTopCategoryLabel(match.listLabel, tr)]
    }
  }
  const labels: string[] = []
  for (const segment of parseCategoryCompound(product.category)) {
    const opt = resolveCategoryOptionFromSegment(segment, categories)
    const label = opt ? getTopCategoryLabel(opt.listLabel, tr) : getTopCategoryLabel(segment, tr)
    if (!labels.includes(label)) labels.push(label)
  }
  return labels
}

const PAGE_SIZES = [50, 100, 250, 500] as const
type PageSize = (typeof PAGE_SIZES)[number]

function statusLabel(status: string, tr: (key: string) => string): string {
  if (status === 'active') return tr('adminProducts.status.published')
  if (status === 'draft') return tr('adminProducts.status.draft')
  if (status === 'inactive') return tr('adminProducts.status.inactive')
  if (status === 'trash') return tr('adminProducts.status.trash')
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
  if (status === 'trash') {
    return isDark
      ? 'bg-red-500/15 text-red-400 border-red-500/30'
      : 'bg-red-50 text-red-800 border-red-200'
  }
  return isDark ? 'bg-dark-800 text-gray-300' : 'bg-gray-100 text-gray-700'
}

function formatAdminPurchasePrice(value: number | null | undefined): string {
  if (value == null) return '—'
  return formatPrice(value, { zeroLabel: '—' })
}

function formatAdminSalePrice(
  value: number | null | undefined,
  tr: (key: string) => string
): string {
  return formatPrice(value, { zeroLabel: tr('product.priceOnRequest') })
}

export default function AdminProductsPage() {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [productStats, setProductStats] = useState<ProductDashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [brandFilter, setBrandFilter] = useState('all')
  const [pageSize, setPageSize] = useState<PageSize>(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [categories, setCategories] = useState<CategoryPickerOption[]>([])
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (!user) return
    const headers = adminAuthHeaders(user)
    Promise.all([
      fetch(appPath('/api/admin/categories'), { headers, cache: 'no-store' }),
      fetch(appPath('/api/brands'), { cache: 'no-store' }),
    ])
      .then(async ([catRes, brandRes]) => {
        if (catRes.ok) {
          const data = await catRes.json()
          if (Array.isArray(data)) {
            setCategories(
              buildCategoryPickerOptions(
                data.map(
                  (c: {
                    id: string
                    name: string
                    parent_id?: string | null
                    parent_name?: string | null
                  }) => ({
                    id: c.id,
                    name: c.name,
                    parent_id: c.parent_id,
                    parent_name: c.parent_name,
                  })
                )
              )
            )
          }
        }
        if (brandRes.ok) {
          const data = await brandRes.json()
          if (Array.isArray(data)) {
            setBrands(
              data
                .map((b: { id: string; name: string }) => ({
                  id: String(b.id),
                  name: String(b.name),
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
            )
          }
        }
      })
      .catch(() => {})
  }, [user])

  const categoryFilterLabel = useMemo(() => {
    if (categoryFilter === 'all') return null
    const match = categories.find((c) => c.id === categoryFilter)
    return match ? getCategoryPickerLabel(match, tr) : categoryFilter
  }, [categoryFilter, categories, tr])

  const loadProducts = useCallback(() => {
    if (!user) return

    setLoading(true)
    setError('')

    const headers = adminAuthHeaders(user)
    const listUrl =
      buildAdminProductsUrl(appPath('/api/products'), {
        page: currentPage,
        limit: pageSize,
        status: statusFilter,
        search: debouncedSearch || undefined,
        categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
        brand: brandFilter !== 'all' ? brandFilter : undefined,
      }) + '&scope=admin'

    Promise.all([
      fetch(listUrl, { headers, cache: 'no-store' }),
      fetch(appPath('/api/products?page=1&limit=1&scope=admin'), { headers, cache: 'no-store' }),
    ])
      .then(async ([listRes, statsRes]) => {
        const listData = await parseJsonResponse<
          { error?: string; items?: Product[] } | Product[]
        >(listRes)
        if (!listRes.ok) {
          throw new Error(
            !Array.isArray(listData) && listData.error ? listData.error : 'Failed to load products'
          )
        }
        if (!isCatalogProductsPage(listData)) throw new Error('Invalid response')
        setProducts(listData.items)
        setTotalItems(listData.total)

        if (statsRes.ok) {
          const statsData = await parseJsonResponse<
            { error?: string; dashboardStats?: ProductDashboardStats } | Product[]
          >(statsRes)
          if (isCatalogProductsPage(statsData)) {
            setProductStats(statsData.dashboardStats ?? null)
          }
        } else {
          setProductStats(null)
        }

        setSelected(new Set())
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
        setProducts([])
        setTotalItems(0)
        setProductStats(null)
      })
      .finally(() => setLoading(false))
  }, [user, currentPage, pageSize, statusFilter, categoryFilter, brandFilter, debouncedSearch])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, statusFilter, categoryFilter, brandFilter, pageSize])

  const stats = useMemo(() => {
    if (productStats) {
      return {
        total: productStats.total,
        active: productStats.active,
        draft: productStats.draft,
        inactive: productStats.inactive,
        trash: productStats.trash ?? 0,
        importDrafts: productStats.importDrafts,
      }
    }
    return { total: 0, active: 0, draft: 0, inactive: 0, trash: 0, importDrafts: 0 }
  }, [productStats])

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage)
  }, [currentPage, safePage])

  const pageItems = products

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

  const runBulkStatus = async (status: 'active' | 'draft' | 'inactive', ids: string[]) => {
    if (!user || !ids.length) return

    const label = statusLabel(status, tr)
    if (!confirm(formatMessage(tr('admin.products.confirmBulkStatus'), { count: ids.length, label }))) return

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
      if (!res.ok) throw new Error(data.error || tr('admin.products.bulkUpdateFailed'))
      loadProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('admin.products.bulkUpdateFailed'))
    } finally {
      setBulkWorking(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!user || !confirm(tr('admin.products.confirmMoveToTrash'))) {
      return
    }
    void runBulkDelete([id], true)
  }

  const runBulkDelete = async (ids: string[], skipConfirm = false) => {
    if (!user || !ids.length) return
    if (
      !skipConfirm &&
      !confirm(
        `Move ${ids.length} product(s) to trash? They will be hidden from the shop but can be restored.`
      )
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

  const runBulkEdit = async (patch: BulkEditPayload) => {
    if (!user || !selectedIds.length) return

    setBulkWorking(true)
    setError('')
    setSuccessMessage('')

    try {
      const res = await fetch(appPath('/api/admin/products/bulk-update'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: selectedIds, ...patch }),
      })
      const data = await parseJsonResponse<{
        error?: string
        updated?: number
        trashedDuplicates?: number
        skippedAlreadyCorrect?: number
      }>(res)
      if (!res.ok) throw new Error(data.error || tr('admin.products.bulkEditFailed'))
      setBulkEditOpen(false)
      const parts: string[] = []
      if (data.updated) parts.push(`${data.updated} updated`)
      if (data.trashedDuplicates) {
        parts.push(`${data.trashedDuplicates} duplicate(s) moved to trash`)
      }
      if (data.skippedAlreadyCorrect) {
        parts.push(`${data.skippedAlreadyCorrect} already correct`)
      }
      if (parts.length) {
        setError('')
        setSuccessMessage(`Bulk edit complete: ${parts.join(', ')}.`)
      }
      loadProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('admin.products.bulkEditFailed'))
    } finally {
      setBulkWorking(false)
    }
  }

  const publishAllDrafts = async () => {
    if (!user || stats.draft <= 0) return
    if (!confirm(formatMessage(tr('admin.products.confirmPublishAll'), { count: stats.draft }))) return

    setBulkWorking(true)
    setError('')
    try {
      const res = await fetch(appPath('/api/admin/products/bulk-status'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active', fromStatus: 'draft' }),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || tr('admin.products.bulkPublishFailed'))
      loadProducts()
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('admin.products.bulkPublishFailed'))
    } finally {
      setBulkWorking(false)
    }
  }

  const selectedIds = Array.from(selected)
  const allOnPageSelected =
    pageItems.length > 0 && pageItems.every((p) => selected.has(p.id))

  return (
    <AdminPageShell
      titleKey="admin.nav.products"
      actions={
        <>
          {stats.draft > 0 && (
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={bulkWorking || loading}
              onClick={publishAllDrafts}
            >
              {formatMessage(tr('admin.products.publishAllDrafts'), { count: stats.draft })}
            </button>
          )}
          <Link href={appPath('/admin/products/new')} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            {tr('admin.products.addProduct')}
          </Link>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <StatCard
          title={tr('admin.products.statTotal')}
          value={stats.total}
          icon={<CubeIcon className="w-6 h-6 text-white" />}
          accentColor="bg-primary-500"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard
          title={tr('admin.products.statPublished')}
          value={stats.active}
          icon={<CheckCircleIcon className="w-6 h-6 text-white" />}
          accentColor="bg-green-500"
          active={statusFilter === 'active'}
          onClick={() => setStatusFilter('active')}
        />
        <StatCard
          title={tr('admin.products.statDraft')}
          value={stats.draft}
          icon={<DocumentTextIcon className="w-6 h-6 text-white" />}
          accentColor="bg-amber-500"
          active={statusFilter === 'draft'}
          onClick={() => setStatusFilter('draft')}
        />
        <StatCard
          title={tr('admin.products.statInactive')}
          value={stats.inactive}
          icon={<NoSymbolIcon className="w-6 h-6 text-white" />}
          accentColor="bg-gray-500"
          active={statusFilter === 'inactive'}
          onClick={() => setStatusFilter('inactive')}
        />
        <StatCard
          title={tr('admin.products.statTrash')}
          value={stats.trash ?? 0}
          icon={<TrashIcon className="w-6 h-6 text-white" />}
          accentColor="bg-red-600"
          href={appPath('/admin/trash')}
        />
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}
      {successMessage && (
        <p className="text-green-600 dark:text-green-400 mb-4">{successMessage}</p>
      )}

      <div className="card mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="flex-1 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.products.search')}</span>
            <input
              type="search"
              className="input w-full"
              placeholder={tr('admin.products.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="sm:w-40 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.products.filterStatus')}</span>
            <select
              className="input w-full"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">{tr('admin.products.allStatuses')}</option>
              <option value="active">{tr('adminProducts.status.published')}</option>
              <option value="draft">{tr('adminProducts.status.draft')}</option>
              <option value="inactive">{tr('adminProducts.status.inactive')}</option>
              <option value="trash">{tr('adminProducts.status.trash')}</option>
            </select>
          </label>
          <label className="sm:w-48 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.products.filterCategory')}</span>
            <select
              className="input w-full"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">{tr('admin.products.allCategories')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {getCategoryPickerLabel(c, tr)}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:w-44 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.products.filterBrand')}</span>
            <select
              className="input w-full"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
            >
              <option value="all">{tr('admin.products.allBrands')}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:w-32 space-y-1">
            <span className={`text-sm font-medium ${t.muted}`}>{tr('admin.products.perPage')}</span>
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
          {formatMessage(tr('admin.products.matchingSummary'), {
            matching: totalItems,
            total: stats.total,
          })}
          {statusFilter !== 'all' && (
            <> · {tr('admin.products.filterStatusPrefix')}: {statusLabel(statusFilter, tr)}</>
          )}
          {categoryFilterLabel && (
            <> · {tr('admin.products.filterCategoryPrefix')}: {categoryFilterLabel}</>
          )}
          {brandFilter !== 'all' && (
            <> · {tr('admin.products.filterBrandPrefix')}: {brandFilter}</>
          )}
        </p>

        {selected.size > 0 && (
          <div
            className={`flex flex-wrap items-center gap-2 pt-3 border-t ${t.rowBorder}`}
          >
            <span className={`text-sm font-medium ${t.heading}`}>
              {formatMessage(tr('admin.products.selected'), { count: selected.size })}
            </span>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={bulkWorking}
              onClick={() => setBulkEditOpen(true)}
            >
              {tr('admin.products.bulkEdit')}
            </button>
            {statusFilter === 'trash' ? (
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={bulkWorking}
                onClick={() => runBulkStatus('active', selectedIds)}
              >
                {tr('admin.products.restoreToShop')}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={bulkWorking}
                onClick={() => runBulkStatus('active', selectedIds)}
              >
                {tr('admin.products.publish')}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={bulkWorking}
              onClick={() => runBulkStatus('draft', selectedIds)}
            >
              {tr('admin.products.setDraft')}
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={bulkWorking}
              onClick={() => runBulkStatus('inactive', selectedIds)}
            >
              {tr('admin.products.setInactive')}
            </button>
            {statusFilter !== 'trash' && (
              <button
                type="button"
                className="text-sm px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                disabled={bulkWorking}
                onClick={() => runBulkDelete(selectedIds)}
              >
                {tr('admin.products.moveToTrash')}
              </button>
            )}
            <button
              type="button"
              className={`text-sm ${t.muted} hover:underline ml-auto`}
              onClick={() => setSelected(new Set())}
            >
              {tr('admin.products.clearSelection')}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className={t.muted}>{tr('loading.products')}</p>
      ) : totalItems === 0 &&
        !debouncedSearch &&
        statusFilter === 'all' &&
        categoryFilter === 'all' &&
        brandFilter === 'all' ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p className="mb-4">{tr('admin.products.noProducts')}</p>
          <Link href={appPath('/admin/products/new')} className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            {tr('admin.products.addFirstProduct')}
          </Link>
        </div>
      ) : totalItems === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p>{tr('admin.products.noMatches')}</p>
          <button
            type="button"
            className="btn-secondary mt-4"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setCategoryFilter('all')
              setBrandFilter('all')
            }}
          >
            {tr('admin.products.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          <div className="card rounded-b-none border-b-0 pb-0">
            <CatalogPagination
              page={safePage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
          <AdminTable>
          <AdminTableHead>
            <AdminTh>
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleAllOnPage}
                aria-label={tr('adminProducts.selectAll')}
                className="rounded border-gray-400"
              />
            </AdminTh>
            <AdminTh>{tr('adminProducts.col.product')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.sku')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.category')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.brand')}</AdminTh>
            <AdminTh>{tr('productForm.purchasePrice')}</AdminTh>
            <AdminTh>{tr('productForm.shippingCost')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.price')}</AdminTh>
            <AdminTh>{tr('adminProducts.col.status')}</AdminTh>
            <AdminTh align="right">{tr('adminProducts.col.actions')}</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {pageItems.map((p) => (
              <AdminTr key={p.id}>
                <AdminTd>
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelected(p.id)}
                    aria-label={formatMessage(tr('adminProducts.selectProduct'), { name: p.name })}
                    className="rounded border-gray-400"
                  />
                </AdminTd>
                <AdminTd>
                  <div className="flex items-center gap-3 min-w-[12rem]">
                    {p.image_url ? (
                      <Image
                        src={productImageSrc(p.image_url)}
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
                <AdminTd>
                  {p.category ? (
                    <div className="flex flex-wrap gap-1.5">
                      {formatAdminProductCategoryLabels(p, categories, tr).map((cat) => (
                        <ProductLabelPill
                          key={cat}
                          label={cat}
                          isDark={t.isDark}
                        />
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </AdminTd>
                <AdminTd>
                  {p.brand || (p.tags && p.tags.length > 0) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {parseBrandCompound(p.brand || '').map((brand) => (
                        <ProductLabelPill key={brand} label={brand} isDark={t.isDark} />
                      ))}
                      {(p.tags ?? []).map((tag) => (
                        <ProductLabelPill
                          key={tag}
                          label={getTagLabel(tag, tr)}
                          isDark={t.isDark}
                        />
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </AdminTd>
                <AdminTd>{formatAdminPurchasePrice(p.purchase_price)}</AdminTd>
                <AdminTd>{formatAdminPurchasePrice(p.shipping_cost)}</AdminTd>
                <AdminTd>{formatAdminSalePrice(p.price, tr)}</AdminTd>
                <AdminTd>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadgeClass(p.status, t.isDark)}`}
                  >
                    {statusLabel(p.status || 'active', tr)}
                  </span>
                </AdminTd>
                <AdminTd align="right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={appPath(`/admin/products/${p.id}/edit`)}
                      className={`p-2 rounded-lg ${t.iconBtn}`}
                      title={tr('adminProducts.edit')}
                    >
                      <PencilIcon className="w-5 h-5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400"
                      title={tr('product.trash.buttonTitle')}
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
            <CatalogPagination
              page={safePage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}
      <AdminBulkEditModal
        open={bulkEditOpen}
        selectedProducts={pageItems.filter((p) => selected.has(p.id))}
        categories={categories}
        brands={brands}
        busy={bulkWorking}
        onClose={() => setBulkEditOpen(false)}
        onApply={runBulkEdit}
      />
    </AdminPageShell>
  )
}
