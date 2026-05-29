'use client'

import { useCallback, useEffect, useState } from 'react'
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
import type { ImportSourceRow } from '@/lib/import-db'

type CategoryOption = { id: string; name: string }
type BrandOption = { id: string; name: string }

type SyncResult = {
  job: { id: string; status: string }
  workerCommand: string
}

const emptyForm = {
  name: '',
  yupoo_category_url: '',
  catalog_category_id: '',
  catalog_brand_id: '',
}

export default function AdminImportPage() {
  const t = useAppTheme()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [sources, setSources] = useState<ImportSourceRow[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [syncInfo, setSyncInfo] = useState<SyncResult | null>(null)

  const loadSources = useCallback(() => {
    if (!user || !isAdmin) return

    setLoading(true)
    setError('')

    fetch(appPath('/api/admin/import/sources'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
    })
      .then(async (r) => {
        const data = await parseJsonResponse<{ error?: string } | ImportSourceRow[]>(r)
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

    fetch(appPath('/api/categories'))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data.map((c: CategoryOption) => ({ id: c.id, name: c.name })))
        }
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError('')
    setSyncInfo(null)

    try {
      const res = await fetch(appPath('/api/admin/import/sources'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
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

  const handleSync = async (sourceId: string) => {
    if (!user) return

    setSyncingId(sourceId)
    setError('')
    setSyncInfo(null)

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
    <AdminPageShell
      title="Yupoo Import"
      description="Add Yupoo category URLs, start a sync job, then run the worker on the VPS."
    >
      <div className="flex flex-wrap gap-3 mb-6">
        <Link href={appPath('/admin/import/review')} className="btn-secondary">
          Review import queue
        </Link>
      </div>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      {syncInfo && (
        <div className={`card mb-6 space-y-2 ${t.muted}`}>
          <p className="text-green-400 font-medium">Import job queued</p>
          <p>Job ID: <code className="text-sm">{syncInfo.job.id}</code></p>
          <p>Run on the VPS (or locally with db:tunnel):</p>
          <pre className={`text-sm p-3 rounded overflow-x-auto ${t.surfaceMuted}`}>
            {syncInfo.workerCommand}
          </pre>
        </div>
      )}

      <section className="card mb-8 space-y-4">
        <h2 className="card-section-title">Add import source</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className={`text-sm ${t.muted}`}>Name</span>
              <input
                className="input w-full"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Nike sneakers batch 1"
                required
              />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className={`text-sm ${t.muted}`}>Yupoo category URL</span>
              <input
                className="input w-full"
                value={form.yupoo_category_url}
                onChange={(e) => setForm((f) => ({ ...f, yupoo_category_url: e.target.value }))}
                placeholder="https://xxx.x.yupoo.com/categories/..."
                required
              />
            </label>
            <label className="block space-y-1">
              <span className={`text-sm ${t.muted}`}>Catalog category</span>
              <select
                className="input w-full"
                value={form.catalog_category_id}
                onChange={(e) => setForm((f) => ({ ...f, catalog_category_id: e.target.value }))}
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className={`text-sm ${t.muted}`}>Catalog brand (optional)</span>
              <select
                className="input w-full"
                value={form.catalog_brand_id}
                onChange={(e) => setForm((f) => ({ ...f, catalog_brand_id: e.target.value }))}
              >
                <option value="">None</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Add source'}
          </button>
        </form>
      </section>

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
              <AdminTh>Actions</AdminTh>
            </AdminTableHead>
            <AdminTableBody>
              {sources.map((source) => (
                <AdminTr key={source.id}>
                  <AdminTd>
                    <div className="font-medium">{source.name}</div>
                    <div className={`text-xs truncate max-w-xs ${t.muted}`}>
                      {source.yupoo_category_url}
                    </div>
                  </AdminTd>
                  <AdminTd>{source.category_name || '—'}</AdminTd>
                  <AdminTd>{source.brand_name || '—'}</AdminTd>
                  <AdminTd>
                    {source.last_synced_at
                      ? new Date(String(source.last_synced_at)).toLocaleString()
                      : 'Never'}
                  </AdminTd>
                  <AdminTd>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      disabled={syncingId === source.id}
                      onClick={() => handleSync(source.id)}
                    >
                      {syncingId === source.id ? 'Starting...' : 'Start sync'}
                    </button>
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
