'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PencilIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from '@/components/admin/AdminTable'
import PricelistSharePasswordSettings from '@/components/pricelist/PricelistSharePasswordSettings'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'
import { PRICELIST_OWNER_QUERY_PLATFORM } from '@/lib/pricelist-constants'

type PricelistPageRow = {
  id: string
  slug: string
  label: string
  sort_order: number
  active: boolean
  sharePath: string
  shareQuery: string
  hasPassword: boolean
  itemCount: number
}

export default function AdminPricelistPagesPage() {
  const t = useAppTheme()
  const { user, isSuperAdmin } = useAuth()
  const [pages, setPages] = useState<PricelistPageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [passwordPage, setPasswordPage] = useState<PricelistPageRow | null>(null)
  const [editingPage, setEditingPage] = useState<PricelistPageRow | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editSortOrder, setEditSortOrder] = useState('0')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(appPath('/api/admin/pricelist-pages'), {
        headers: adminAuthHeaders(user),
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setPages(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !isSuperAdmin) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(appPath('/api/admin/pricelist-pages'), {
        method: 'POST',
        headers: { ...adminAuthHeaders(user), 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, label }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create')
      setSlug('')
      setLabel('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (page: PricelistPageRow) => {
    if (!user || !isSuperAdmin) return
    if (page.slug === PRICELIST_OWNER_QUERY_PLATFORM && page.active) return
    setBusy(true)
    try {
      const res = await fetch(appPath(`/api/admin/pricelist-pages/${page.id}`), {
        method: 'PATCH',
        headers: { ...adminAuthHeaders(user), 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !page.active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (page: PricelistPageRow) => {
    if (!isSuperAdmin) return
    setEditingPage(page)
    setEditLabel(page.label)
    setEditSlug(page.slug)
    setEditSortOrder(String(page.sort_order ?? 0))
    setPasswordPage(null)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingPage(null)
    setEditLabel('')
    setEditSlug('')
    setEditSortOrder('0')
  }

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !isSuperAdmin || !editingPage) return
    setBusy(true)
    setError(null)
    try {
      const isPlatform = editingPage.slug === PRICELIST_OWNER_QUERY_PLATFORM
      const res = await fetch(appPath(`/api/admin/pricelist-pages/${editingPage.id}`), {
        method: 'PATCH',
        headers: { ...adminAuthHeaders(user), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: editLabel,
          slug: isPlatform ? undefined : editSlug,
          sortOrder: Number(editSortOrder),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')
      cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (page: PricelistPageRow) => {
    if (!user || !isSuperAdmin) return
    if (page.slug === PRICELIST_OWNER_QUERY_PLATFORM) return
    if (page.itemCount > 0) {
      setError('Cannot delete a pricelist page that still has products. Remove all products first.')
      return
    }
    if (
      !window.confirm(
        `Delete pricelist page "${page.label}" (${page.slug})? This cannot be undone.`
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(appPath(`/api/admin/pricelist-pages/${page.id}`), {
        method: 'DELETE',
        headers: adminAuthHeaders(user),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete')
      if (passwordPage?.id === page.id) setPasswordPage(null)
      if (editingPage?.id === page.id) cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setBusy(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <AdminPageShell title="Pricelist pages">
        <p className={t.muted}>Super admin access required.</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell title="Pricelist pages">
      <p className={`text-sm mb-6 ${t.muted}`}>
        Create separate supplier pricelist pages (e.g. platform2, platform3). Each page has its
        own share link, product list, and synced purchase prices in admin products.
      </p>

      {error ? <p className="text-red-500 text-sm mb-4">{error}</p> : null}

      <form onSubmit={handleCreate} className={`card mb-6 space-y-3 ${t.border}`}>
        <h2 className={`text-lg font-semibold ${t.heading}`}>Create page</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={`text-sm ${t.muted}`}>Slug (URL)</span>
            <input
              className="input w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="platform2"
              required
              pattern="[a-z][a-z0-9_-]*"
            />
          </label>
          <label className="space-y-1">
            <span className={`text-sm ${t.muted}`}>Label</span>
            <input
              className="input w-full"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Supplier A"
              required
            />
          </label>
        </div>
        <button type="submit" className="btn-primary text-sm" disabled={busy}>
          Create pricelist page
        </button>
      </form>

      {editingPage ? (
        <form onSubmit={handleSaveEdit} className={`card mb-6 space-y-3 ${t.border}`}>
          <h2 className={`text-lg font-semibold ${t.heading}`}>Edit page</h2>
          <p className={`text-sm ${t.muted}`}>
            Editing <strong>{editingPage.label}</strong>
            {editingPage.slug === PRICELIST_OWNER_QUERY_PLATFORM
              ? ' — platform slug cannot be changed'
              : null}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className={`text-sm ${t.muted}`}>Label</span>
              <input
                className="input w-full"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
              />
            </label>
            <label className="space-y-1">
              <span className={`text-sm ${t.muted}`}>Slug (URL)</span>
              <input
                className="input w-full"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                required
                disabled={editingPage.slug === PRICELIST_OWNER_QUERY_PLATFORM}
                pattern="[a-z][a-z0-9_-]*"
              />
            </label>
            <label className="space-y-1">
              <span className={`text-sm ${t.muted}`}>Sort order</span>
              <input
                type="number"
                className="input w-full"
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(e.target.value)}
                min={0}
                step={1}
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={busy}>
              Save changes
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={busy}
              onClick={cancelEdit}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className={t.muted}>Loading…</p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Label</AdminTh>
            <AdminTh>Slug</AdminTh>
            <AdminTh>Products</AdminTh>
            <AdminTh>Share link</AdminTh>
            <AdminTh>Active</AdminTh>
            <AdminTh align="right">Actions</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {pages.map((page) => (
              <AdminTr key={page.id}>
                <AdminTd>{page.label}</AdminTd>
                <AdminTd>
                  <code className="text-xs">{page.slug}</code>
                </AdminTd>
                <AdminTd>{page.itemCount}</AdminTd>
                <AdminTd>
                  <Link
                    href={appPath(page.sharePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-500 text-sm hover:underline break-all"
                  >
                    ?{page.shareQuery}
                  </Link>
                </AdminTd>
                <AdminTd>{page.active ? 'Yes' : 'No'}</AdminTd>
                <AdminTd align="right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="btn-secondary text-xs inline-flex items-center gap-1"
                      disabled={busy}
                      onClick={() => startEdit(page)}
                      title="Edit label, slug, and sort order"
                    >
                      <PencilIcon className="w-3.5 h-3.5" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => {
                        setEditingPage(null)
                        setPasswordPage(page)
                      }}
                    >
                      Password
                    </button>
                    {page.slug !== PRICELIST_OWNER_QUERY_PLATFORM ? (
                      <>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={busy}
                          onClick={() => toggleActive(page)}
                        >
                          {page.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          disabled={busy || page.itemCount > 0}
                          title={
                            page.itemCount > 0
                              ? 'Remove all products from this list before deleting'
                              : 'Delete pricelist page'
                          }
                          onClick={() => void handleDelete(page)}
                        >
                          Delete
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

      {passwordPage ? (
        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className={`text-lg font-semibold ${t.heading}`}>
              Share password — {passwordPage.label}
            </h2>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setPasswordPage(null)}
            >
              Close
            </button>
          </div>
          <PricelistSharePasswordSettings
            ownerId={passwordPage.id}
            ownerQuery={passwordPage.slug}
          />
        </div>
      ) : null}
    </AdminPageShell>
  )
}
