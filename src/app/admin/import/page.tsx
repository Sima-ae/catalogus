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
import {
  buildCategoryPickerOptions,
  formatCategoryDisplayName,
  type CategoryPickerOption,
} from '@/lib/category-picker'

type BrandOption = { id: string; name: string }

type SyncResult = {
  kind: 'sync' | 'retry-skipped' | 'refresh-all'
  job: { id: string; status: string }
  workerCommand: string
  skippedCount?: number
  refreshCount?: number
}

const emptyForm: ImportSourceFormValues = {
  name: '',
  yupoo_category_url: '',
  yupoo_access_password: '',
  catalog_category_id: '',
  catalog_brand_id: '',
}

function sourceToForm(source: ImportSourcePublic): ImportSourceFormValues {
  return {
    name: source.name,
    yupoo_category_url: source.yupoo_category_url,
    yupoo_access_password: '',
    catalog_category_id: source.catalog_category_id || '',
    catalog_brand_id: source.catalog_brand_id || '',
  }
}

function formToApiBody(values: ImportSourceFormValues): Record<string, string> {
  const body: Record<string, string> = {
    name: values.name,
    yupoo_category_url: values.yupoo_category_url,
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

  const loadSources = useCallback(() => {
    if (!user || !isAdmin) return

    setLoading(true)
    setError('')

    fetch(appPath('/api/admin/import/sources'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
    })
      .then(async (r) => {
        const data = await parseJsonResponse<{ error?: string } | ImportSourcePublic[]>(r)
        if (!r.ok) {
          throw new Error(!Array.isArray(data) && data.error ? data.error : 'Failed to load sources')
        }
        if (!Array.isArray(data)) throw new Error('Invalid response')
        setSources(data)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => setLoading(false))
  }, [user, isAdmin])

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

    loadSources()
  }, [authLoading, isAdmin, user, loadSources])

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
      loadSources()
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
      loadSources()
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
      loadSources()
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
      loadSources()
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
      loadSources()
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
      loadSources()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <AdminPageShell title="Yupoo Import">
        <p className="text-red-400">Only admin users can view this page.</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell title="Import">
      <div className="flex flex-wrap gap-3 mb-6">
        <Link href={appPath('/admin/import/review')} className="btn-secondary">
          Review import queue
        </Link>
      </div>

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
                : 'Import job queued'}
          </p>
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
        {loading ? (
          <p className={t.muted}>Loading...</p>
        ) : sources.length === 0 ? (
          <p className={t.muted}>No import sources yet.</p>
        ) : (
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
                    <div className={`text-xs truncate max-w-xs ${t.muted}`}>
                      {source.yupoo_category_url}
                    </div>
                    {source.hasPassword ? (
                      <div className={`text-xs mt-0.5 ${t.muted}`}>Password set</div>
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
        )}
      </section>
    </AdminPageShell>
  )
}
