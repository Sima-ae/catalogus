'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ClipboardDocumentIcon,
  CheckIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import ImportSourceForm, {
  type ImportSourceFormValues,
} from '@/components/admin/ImportSourceForm'
import FacebookPostImportPanel from '@/components/admin/FacebookPostImportPanel'
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
import type { ImportSourcePublic } from '@/lib/import-db'
import { IMPORT_SOURCES_PAGE_SIZE } from '@/lib/import-sources-constants'
import CatalogPagination from '@/components/shop/CatalogPagination'
import {
  buildCategoryPickerOptions,
  formatCategoryDisplayName,
  type CategoryPickerOption,
} from '@/lib/category-picker'

type BrandOption = { id: string; name: string }

type ImportSourcesResponse = {
  items: ImportSourcePublic[]
  total: number
  page: number
  limit: number
}

type SyncResult = {
  kind: 'sync' | 'retry-skipped' | 'refresh-all' | 'import-product' | 'import-facebook-post'
  job: { id: string; status: string }
  workerCommand: string
  skippedCount?: number
  refreshCount?: number
  productUrl?: string
  postUrl?: string
}

const emptyForm: ImportSourceFormValues = {
  name: '',
  source_type: 'yupoo',
  yupoo_category_url: '',
  yupoo_access_password: '',
  woocommerce_store_url: '',
  woocommerce_category_slug: '',
  woocommerce_price_mode: 'purchase_price',
  woocommerce_shipping_cost: '',
  catalog_list_url: '',
  catalog_category_id: '',
  catalog_brand_id: '',
}

function sourceToForm(source: ImportSourcePublic): ImportSourceFormValues {
  const typeRaw = String(source.source_type ?? 'yupoo').toLowerCase()
  const source_type =
    typeRaw === 'woocommerce'
      ? 'woocommerce'
      : typeRaw === 'facebook'
        ? 'facebook'
        : typeRaw === 'lkxox'
          ? 'lkxox'
          : 'yupoo'
  return {
    name: source.name,
    source_type,
    yupoo_category_url: source.yupoo_category_url || '',
    yupoo_access_password: '',
    woocommerce_store_url: source.woocommerce_store_url || '',
    woocommerce_category_slug: source.woocommerce_category_slug || '',
    woocommerce_price_mode:
      String(source.woocommerce_price_mode ?? '').toLowerCase() === 'purchase_price'
        ? 'purchase_price'
        : 'storefront',
    woocommerce_shipping_cost:
      source.woocommerce_shipping_cost != null && source.woocommerce_shipping_cost !== ''
        ? String(source.woocommerce_shipping_cost)
        : '',
    catalog_list_url: source.catalog_list_url || '',
    catalog_category_id: source.catalog_category_id || '',
    catalog_brand_id: source.catalog_brand_id || '',
  }
}

function formToApiBody(values: ImportSourceFormValues): Record<string, string> {
  const body: Record<string, string> = {
    name: values.name,
    source_type: values.source_type,
    yupoo_category_url: values.yupoo_category_url,
    woocommerce_store_url: values.woocommerce_store_url,
    woocommerce_category_slug: values.woocommerce_category_slug,
    woocommerce_price_mode: values.woocommerce_price_mode,
    woocommerce_shipping_cost: values.woocommerce_shipping_cost,
    catalog_list_url: values.catalog_list_url,
    catalog_category_id: values.catalog_category_id,
    catalog_brand_id: values.catalog_brand_id,
  }
  const pwd = values.yupoo_access_password.trim()
  if (pwd) body.yupoo_access_password = pwd
  return body
}

export default function AdminImportPage() {
  const t = useAppTheme()
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth()
  const [sources, setSources] = useState<ImportSourcePublic[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [categories, setCategories] = useState<CategoryPickerOption[]>([])
  const [categoryLabels, setCategoryLabels] = useState<Map<string, string>>(new Map())
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [syncInfo, setSyncInfo] = useState<SyncResult | null>(null)
  const [copiedCommand, setCopiedCommand] = useState(false)
  const [copiedJobId, setCopiedJobId] = useState(false)
  const [productUrlBySource, setProductUrlBySource] = useState<Record<string, string>>({})
  const [importingUrlId, setImportingUrlId] = useState<string | null>(null)

  const loadSources = useCallback(
    (opts?: { silent?: boolean; page?: number }) => {
      if (!user || !isAdmin) return

      const page = opts?.page ?? currentPage
      if (!opts?.silent) setLoading(true)
      setError('')

      fetch(
        appPath(
          `/api/admin/import/sources?page=${page}&limit=${IMPORT_SOURCES_PAGE_SIZE}`
        ),
        {
          headers: adminAuthHeaders(user),
          cache: 'no-store',
        }
      )
        .then(async (r) => {
          const data = await parseJsonResponse<{ error?: string } | ImportSourcesResponse>(r)
          if (!r.ok) {
            throw new Error(
              'error' in data && data.error ? data.error : 'Failed to load sources'
            )
          }
          if (!('items' in data) || !Array.isArray(data.items)) {
            throw new Error('Invalid response')
          }
          setSources(data.items)
          setTotalItems(data.total)
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : 'Failed to load')
          setSources([])
          setTotalItems(0)
        })
        .finally(() => {
          if (!opts?.silent) setLoading(false)
        })
    },
    [user, isAdmin, currentPage]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(totalItems / IMPORT_SOURCES_PAGE_SIZE) || 1
  )
  const safePage = Math.min(Math.max(1, currentPage), totalPages)

  useEffect(() => {
    if (currentPage !== safePage) setCurrentPage(safePage)
  }, [currentPage, safePage])

  useEffect(() => {
    if (authLoading || !isAdmin || !user) return

    fetch(appPath('/api/admin/categories'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        const picker = buildCategoryPickerOptions(
          data.map((c: { id: string; name: string; parent_id?: string | null; parent_name?: string | null }) => ({
            id: c.id,
            name: c.name,
            parent_id: c.parent_id,
            parent_name: c.parent_name,
          }))
        )
        setCategories(picker)
        const labels = new Map<string, string>()
        for (const c of picker) {
          labels.set(
            c.id,
            formatCategoryDisplayName(c.name, c.parent_name)
          )
        }
        setCategoryLabels(labels)
      })
      .catch(() => {})

    fetch(appPath('/api/brands'))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBrands(data.map((b: BrandOption) => ({ id: b.id, name: b.name })))
        }
      })
      .catch(() => {})
  }, [authLoading, isAdmin, user])

  useEffect(() => {
    if (authLoading || !isAdmin || !user) return
    loadSources()
  }, [authLoading, isAdmin, user, currentPage, loadSources])

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        return ok
      } catch {
        return false
      }
    }
  }

  const handleCopyCommand = async () => {
    if (!syncInfo?.workerCommand) return
    const ok = await copyToClipboard(syncInfo.workerCommand)
    if (ok) {
      setCopiedCommand(true)
      window.setTimeout(() => setCopiedCommand(false), 2000)
    } else {
      setError('Could not copy to clipboard')
    }
  }

  const handleCopyJobId = async () => {
    if (!syncInfo?.job.id) return
    const ok = await copyToClipboard(syncInfo.job.id)
    if (ok) {
      setCopiedJobId(true)
      window.setTimeout(() => setCopiedJobId(false), 2000)
    } else {
      setError('Could not copy to clipboard')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSuperAdmin) return

    setSaving(true)
    setError('')
    setSyncInfo(null)
    setCopiedCommand(false)
    setCopiedJobId(false)

    try {
      const res = await fetch(appPath('/api/admin/import/sources'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formToApiBody(form)),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Create failed')

      setForm(emptyForm)
      if (currentPage !== 1) {
        setCurrentPage(1)
      } else {
        loadSources({ page: 1 })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (source: ImportSourcePublic) => {
    setEditingId(source.id)
    setEditForm(sourceToForm(source))
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyForm)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !isSuperAdmin || !editingId) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch(appPath(`/api/admin/import/sources/${editingId}`), {
        method: 'PATCH',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formToApiBody(editForm)),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Update failed')

      cancelEdit()
      loadSources({ silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (source: ImportSourcePublic) => {
    if (!user || !isSuperAdmin) return
    if (
      !window.confirm(
        `Delete import source "${source.name}"? Related import jobs will be removed. This cannot be undone.`
      )
    ) {
      return
    }

    setDeletingId(source.id)
    setError('')

    try {
      const res = await fetch(appPath(`/api/admin/import/sources/${source.id}`), {
        method: 'DELETE',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Delete failed')

      if (editingId === source.id) cancelEdit()

      const remaining = totalItems - 1
      const maxPage = Math.max(
        1,
        Math.ceil(remaining / IMPORT_SOURCES_PAGE_SIZE) || 1
      )
      if (currentPage > maxPage) {
        setCurrentPage(maxPage)
      } else {
        loadSources({ silent: true })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRefreshAll = async (sourceId: string) => {
    if (!user) return

    if (
      !window.confirm(
        'Re-fetch all imported albums from Yupoo and update products (titles, images, descriptions)? This re-processes the latest job.'
      )
    ) {
      return
    }

    setRefreshingId(sourceId)
    setError('')
    setSyncInfo(null)
    setCopiedCommand(false)
    setCopiedJobId(false)

    try {
      const res = await fetch(appPath(`/api/admin/import/sources/${sourceId}/refresh-all`), {
        method: 'POST',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<SyncResult & { error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Refresh failed')
      setSyncInfo(data)
      loadSources({ silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setRefreshingId(null)
    }
  }

  const handleRetrySkipped = async (sourceId: string) => {
    if (!user) return

    setRetryingId(sourceId)
    setError('')
    setSyncInfo(null)
    setCopiedCommand(false)
    setCopiedJobId(false)

    try {
      const res = await fetch(appPath(`/api/admin/import/sources/${sourceId}/retry-skipped`), {
        method: 'POST',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<SyncResult & { error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Retry failed')
      setSyncInfo(data)
      loadSources({ silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Retry failed')
    } finally {
      setRetryingId(null)
    }
  }

  const handleSync = async (sourceId: string) => {
    if (!user) return

    setSyncingId(sourceId)
    setError('')
    setSyncInfo(null)
    setCopiedCommand(false)
    setCopiedJobId(false)

    try {
      const res = await fetch(appPath(`/api/admin/import/sources/${sourceId}/sync`), {
        method: 'POST',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<SyncResult & { error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      setSyncInfo(data)
      loadSources({ silent: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  const handleImportProductUrl = async (sourceId: string) => {
    if (!user) return

    const productUrl = productUrlBySource[sourceId]?.trim()
    if (!productUrl) {
      setError('Enter a product URL first')
      return
    }

    setImportingUrlId(sourceId)
    setError('')
    setSyncInfo(null)
    setCopiedCommand(false)
    setCopiedJobId(false)

    try {
      const res = await fetch(appPath(`/api/admin/import/sources/${sourceId}/import-product`), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productUrl }),
      })
      const data = await parseJsonResponse<SyncResult & { error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Import failed')
      setSyncInfo(data)
      loadSources({ silent: true })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Import failed'
      setError(
        message === 'Failed to fetch' || message === 'fetch failed'
          ? 'Could not reach the server. Check your connection or deploy the latest import-product API.'
          : message
      )
    } finally {
      setImportingUrlId(null)
    }
  }

  if (!isAdmin) {
    return (
      <AdminPageShell titleKey="admin.page.yupooImport">
        <p className="text-red-400">Only admin users can view this page.</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      titleKey="admin.nav.import"
      actions={
        <Link href={appPath('/admin/import/review')} className="btn-secondary">
          Review import queue
        </Link>
      }
    >
      {!isSuperAdmin && !authLoading ? (
        <p className={`text-sm mb-4 ${t.muted}`}>
          Only super admin can add, edit, or delete import sources. You can start sync jobs below.
        </p>
      ) : null}

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {syncInfo && (
        <div className={`card mb-6 space-y-3 ${t.muted}`}>
          <p className="text-green-400 font-medium">
            {syncInfo.kind === 'retry-skipped'
              ? `Retry queued${syncInfo.skippedCount ? ` (${syncInfo.skippedCount} skipped albums)` : ''}`
              : syncInfo.kind === 'refresh-all'
                ? `Refresh queued${syncInfo.refreshCount ? ` (${syncInfo.refreshCount} albums)` : ''}`
                : syncInfo.kind === 'import-product'
                  ? 'Single product import queued (uses --refresh to update existing)'
                  : syncInfo.kind === 'import-facebook-post'
                    ? 'Facebook post import queued (uses --refresh to update existing)'
                    : 'Import job queued'}
          </p>
          {syncInfo.kind === 'import-product' ? (
            <p className="text-sm">
              Job queued — WooCommerce is fetched when you run{' '}
              <code className="text-xs">import:worker</code> on the VPS (not in the browser).
            </p>
          ) : null}
          {syncInfo.kind === 'import-facebook-post' ? (
            <p className="text-sm">
              Job queued — Facebook post is fetched when you run{' '}
              <code className="text-xs">import:worker</code> on the VPS (not in the browser).
            </p>
          ) : null}
          {syncInfo.kind === 'import-product' && syncInfo.productUrl ? (
            <p className="text-sm break-all">{syncInfo.productUrl}</p>
          ) : null}
          {(syncInfo.kind === 'import-facebook-post' && syncInfo.postUrl) ? (
            <p className="text-sm break-all">{syncInfo.postUrl}</p>
          ) : null}
          {syncInfo.kind === 'retry-skipped' || syncInfo.kind === 'refresh-all' ? (
            <p className="text-sm">
              Re-fetches Yupoo and updates products already in the catalog. Run this command on the
              VPS (or locally with db:tunnel):
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Job ID: <code className="text-sm">{syncInfo.job.id}</code>
            </span>
            <button
              type="button"
              className="btn-secondary text-sm inline-flex items-center gap-1.5"
              onClick={handleCopyJobId}
            >
              {copiedJobId ? (
                <>
                  <CheckIcon className="w-4 h-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Copy job ID
                </>
              )}
            </button>
          </div>
          <p>Run on the VPS (or locally with db:tunnel):</p>
          <div className="flex flex-col sm:flex-row sm:items-start gap-2">
            <pre
              className={`text-sm p-3 rounded overflow-x-auto flex-1 select-text ${t.surfaceMuted}`}
            >
              {syncInfo.workerCommand}
            </pre>
            <button
              type="button"
              className="btn-primary text-sm inline-flex items-center justify-center gap-1.5 shrink-0"
              onClick={handleCopyCommand}
            >
              {copiedCommand ? (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardDocumentIcon className="w-4 h-4" />
                  Copy command
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isSuperAdmin && !editingId ? (
        <section className="card mb-8 space-y-4">
          <h2 className="card-section-title">Add import source</h2>
          <ImportSourceForm
            values={form}
            onChange={setForm}
            onSubmit={handleCreate}
            submitLabel="Add source"
            saving={saving}
            categories={categories}
            brands={brands}
          />
        </section>
      ) : null}

      {isSuperAdmin && editingId ? (
        <section className="card mb-8 space-y-4">
          <h2 className="card-section-title">Edit import source</h2>
          <ImportSourceForm
            values={editForm}
            onChange={setEditForm}
            onSubmit={handleUpdate}
            onCancel={cancelEdit}
            submitLabel="Save changes"
            saving={saving}
            categories={categories}
            brands={brands}
            hasPassword={
              sources.find((s) => s.id === editingId)?.hasPassword ?? false
            }
          />
        </section>
      ) : null}

      <section>
        <h2 className="card-section-title mb-4">Import sources</h2>
        {totalItems > 0 ? (
          <CatalogPagination
            page={safePage}
            totalItems={totalItems}
            pageSize={IMPORT_SOURCES_PAGE_SIZE}
            onPageChange={setCurrentPage}
            compact
          />
        ) : null}
        {loading ? (
          <p className={t.muted}>Loading...</p>
        ) : sources.length === 0 ? (
          <p className={t.muted}>No import sources yet.</p>
        ) : (
          <>
          <AdminTable>
            <AdminTableHead>
              <AdminTh>Name</AdminTh>
              <AdminTh>Category</AdminTh>
              <AdminTh>Brand</AdminTh>
              <AdminTh>Last synced</AdminTh>
              <AdminTh align="right">Actions</AdminTh>
            </AdminTableHead>
            <AdminTableBody>
              {sources.map((source) => (
                <AdminTr key={source.id}>
                  <AdminTd>
                    <div className="font-medium">{source.name}</div>
                    <div className={`text-xs mt-0.5 inline-flex rounded px-1.5 py-0.5 ${
                      source.source_type === 'woocommerce'
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200'
                        : source.source_type === 'facebook'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                          : source.source_type === 'lkxox'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                            : 'bg-gray-100 text-gray-700 dark:bg-dark-700 dark:text-gray-300'
                    }`}>
                      {source.source_type === 'woocommerce'
                        ? 'WooCommerce'
                        : source.source_type === 'facebook'
                          ? 'Facebook'
                          : source.source_type === 'lkxox'
                            ? 'Lkxox'
                            : 'Yupoo'}
                    </div>
                    <div className={`text-xs truncate max-w-xs mt-1 ${t.muted}`}>
                      {source.source_type === 'woocommerce'
                        ? source.woocommerce_store_url || '—'
                        : source.source_type === 'facebook'
                          ? 'Single post imports'
                          : source.source_type === 'lkxox'
                            ? source.catalog_list_url || '—'
                            : source.yupoo_category_url || '—'}
                    </div>
                    {source.source_type === 'woocommerce' && source.woocommerce_category_slug ? (
                      <div className={`text-xs mt-0.5 ${t.muted}`}>
                        WC category: {source.woocommerce_category_slug}
                      </div>
                    ) : null}
                    {source.source_type === 'woocommerce' &&
                    String(source.woocommerce_price_mode ?? '').toLowerCase() ===
                      'purchase_price' ? (
                      <div className="text-xs mt-0.5 inline-flex rounded px-1.5 py-0.5 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        Purchase price mode
                      </div>
                    ) : null}
                    {source.source_type === 'woocommerce' &&
                    source.woocommerce_shipping_cost != null &&
                    source.woocommerce_shipping_cost !== '' ? (
                      <div className={`text-xs mt-0.5 ${t.muted}`}>
                        Shipping: € {Number(source.woocommerce_shipping_cost).toFixed(2).replace('.', ',')}
                      </div>
                    ) : null}
                    {source.source_type !== 'woocommerce' &&
                    source.source_type !== 'facebook' &&
                    source.hasPassword ? (
                      <div className={`text-xs mt-0.5 ${t.muted}`}>Password set</div>
                    ) : null}
                    {source.source_type === 'woocommerce' ? (
                      <div className="mt-2 flex flex-col gap-1.5 max-w-md">
                        <input
                          type="url"
                          className="input w-full text-xs py-1.5"
                          value={productUrlBySource[source.id] ?? ''}
                          onChange={(e) =>
                            setProductUrlBySource((prev) => ({
                              ...prev,
                              [source.id]: e.target.value,
                            }))
                          }
                          placeholder="https://stuntxl.com/product/…"
                          aria-label={`Product URL for ${source.name}`}
                        />
                        <button
                          type="button"
                          className="btn-secondary text-xs self-start"
                          disabled={
                            importingUrlId === source.id ||
                            syncingId === source.id ||
                            !productUrlBySource[source.id]?.trim()
                          }
                          onClick={() => handleImportProductUrl(source.id)}
                        >
                          {importingUrlId === source.id ? 'Queuing…' : 'Import product URL'}
                        </button>
                      </div>
                    ) : source.source_type === 'facebook' && user ? (
                      <FacebookPostImportPanel
                        sourceId={source.id}
                        sourceName={source.name}
                        user={user}
                        categories={categories}
                        brands={brands}
                        disabled={
                          syncingId === source.id ||
                          retryingId === source.id ||
                          refreshingId === source.id
                        }
                        onError={setError}
                        onSyncInfo={(info) => {
                          setError('')
                          setSyncInfo(null)
                          setCopiedCommand(false)
                          setCopiedJobId(false)
                          setSyncInfo({
                            kind: info.kind,
                            job: { id: info.job.id, status: 'queued' },
                            workerCommand: info.workerCommand,
                            postUrl: info.postUrl,
                          })
                          loadSources({ silent: true })
                          if (typeof window !== 'undefined') {
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }
                        }}
                      />
                    ) : null}
                  </AdminTd>
                  <AdminTd>
                    {source.catalog_category_id
                      ? categoryLabels.get(source.catalog_category_id) ||
                        source.category_name ||
                        '—'
                      : source.category_name || '—'}
                  </AdminTd>
                  <AdminTd>{source.brand_name || '—'}</AdminTd>
                  <AdminTd>
                    {source.last_synced_at
                      ? new Date(String(source.last_synced_at)).toLocaleString()
                      : 'Never'}
                  </AdminTd>
                  <AdminTd>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {source.source_type !== 'facebook' ? (
                        <>
                          <button
                            type="button"
                            className="btn-secondary text-sm"
                            disabled={
                              syncingId === source.id ||
                              retryingId === source.id ||
                              refreshingId === source.id
                            }
                            onClick={() => handleSync(source.id)}
                          >
                            {syncingId === source.id ? 'Starting...' : 'Start sync'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-sm"
                            disabled={
                              syncingId === source.id ||
                              retryingId === source.id ||
                              refreshingId === source.id ||
                              !source.last_synced_at
                            }
                            title={
                              source.last_synced_at
                                ? 'Re-fetch all imported albums from Yupoo and update products'
                                : 'Run Start sync first'
                            }
                            onClick={() => handleRefreshAll(source.id)}
                          >
                            {refreshingId === source.id ? 'Queuing…' : 'Refresh all'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-sm"
                            disabled={
                              syncingId === source.id ||
                              retryingId === source.id ||
                              refreshingId === source.id ||
                              !(Number(source.skipped_items) > 0)
                            }
                            title={
                              Number(source.skipped_items) > 0
                                ? `${source.skipped_items} skipped on latest job — refresh from Yupoo`
                                : 'No skipped albums on the latest job'
                            }
                            onClick={() => handleRetrySkipped(source.id)}
                          >
                            {retryingId === source.id ? 'Queuing…' : 'Retry skipped'}
                          </button>
                        </>
                      ) : null}
                      {isSuperAdmin ? (
                        <>
                          <button
                            type="button"
                            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm btn-secondary`}
                            onClick={() => startEdit(source)}
                            disabled={saving && editingId === source.id}
                          >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(source)}
                            disabled={deletingId === source.id}
                            className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm disabled:opacity-50 ${
                              t.isDark
                                ? 'text-red-400 hover:bg-red-500/10'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <TrashIcon className="w-4 h-4" />
                            {deletingId === source.id ? '…' : 'Delete'}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </AdminTd>
                </AdminTr>
              ))}
            </AdminTableBody>
          </AdminTable>
          <CatalogPagination
            page={safePage}
            totalItems={totalItems}
            pageSize={IMPORT_SOURCES_PAGE_SIZE}
            onPageChange={setCurrentPage}
            compact
          />
          </>
        )}
      </section>
    </AdminPageShell>
  )
}
