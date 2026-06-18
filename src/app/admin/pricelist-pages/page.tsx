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
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
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
  const { t: tr } = useI18n()
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
      if (!res.ok) throw new Error(data.error || tr('admin.pricelistPages.errorLoad'))
      setPages(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('admin.pricelistPages.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [user, tr])

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
      if (!res.ok) throw new Error(data.error || tr('admin.pricelistPages.errorCreate'))
      setSlug('')
      setLabel('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('admin.pricelistPages.errorCreate'))
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
      if (!res.ok) throw new Error(data.error || tr('admin.pricelistPages.errorUpdate'))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('admin.pricelistPages.errorUpdate'))
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
      if (!res.ok) throw new Error(data.error || tr('admin.pricelistPages.errorUpdate'))
      cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('admin.pricelistPages.errorUpdate'))
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (page: PricelistPageRow) => {
    if (!user || !isSuperAdmin) return
    if (page.slug === PRICELIST_OWNER_QUERY_PLATFORM) return
    if (page.itemCount > 0) {
      setError(tr('admin.pricelistPages.errorDeleteHasProducts'))
      return
    }
    if (
      !window.confirm(
        formatMessage(tr('admin.pricelistPages.confirmDelete'), {
          label: page.label,
          slug: page.slug,
        })
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
      if (!res.ok) throw new Error(data.error || tr('admin.pricelistPages.errorDelete'))
      if (passwordPage?.id === page.id) setPasswordPage(null)
      if (editingPage?.id === page.id) cancelEdit()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('admin.pricelistPages.errorDelete'))
    } finally {
      setBusy(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <AdminPageShell titleKey="admin.nav.pricelistPages">
        <p className={t.muted}>{tr('admin.pricelistPages.superAdminRequired')}</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell titleKey="admin.nav.pricelistPages">
      <p className={`text-sm mb-6 ${t.muted}`}>{tr('admin.pricelistPages.intro')}</p>

      {error ? <p className="text-red-500 text-sm mb-4">{error}</p> : null}

      <form onSubmit={handleCreate} className={`card mb-6 space-y-3 ${t.border}`}>
        <h2 className={`text-lg font-semibold ${t.heading}`}>
          {tr('admin.pricelistPages.createSection')}
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className={`text-sm ${t.muted}`}>{tr('admin.pricelistPages.slugLabel')}</span>
            <input
              className="input w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={tr('admin.pricelistPages.slugPlaceholder')}
              required
              pattern="[a-z][a-z0-9_-]*"
            />
          </label>
          <label className="space-y-1">
            <span className={`text-sm ${t.muted}`}>{tr('admin.pricelistPages.labelLabel')}</span>
            <input
              className="input w-full"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={tr('admin.pricelistPages.labelPlaceholder')}
              required
            />
          </label>
        </div>
        <button type="submit" className="btn-primary text-sm" disabled={busy}>
          {tr('admin.pricelistPages.createButton')}
        </button>
      </form>

      {editingPage ? (
        <form onSubmit={handleSaveEdit} className={`card mb-6 space-y-3 ${t.border}`}>
          <h2 className={`text-lg font-semibold ${t.heading}`}>
            {tr('admin.pricelistPages.editSection')}
          </h2>
          <p className={`text-sm ${t.muted}`}>
            {formatMessage(tr('admin.pricelistPages.editing'), { label: editingPage.label })}
            {editingPage.slug === PRICELIST_OWNER_QUERY_PLATFORM
              ? tr('admin.pricelistPages.platformSlugLocked')
              : null}
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className={`text-sm ${t.muted}`}>{tr('admin.pricelistPages.labelLabel')}</span>
              <input
                className="input w-full"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
              />
            </label>
            <label className="space-y-1">
              <span className={`text-sm ${t.muted}`}>{tr('admin.pricelistPages.slugLabel')}</span>
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
              <span className={`text-sm ${t.muted}`}>{tr('admin.pricelistPages.sortOrder')}</span>
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
              {tr('admin.pricelistPages.saveChanges')}
            </button>
            <button
              type="button"
              className="btn-secondary text-sm"
              disabled={busy}
              onClick={cancelEdit}
            >
              {tr('admin.pricelistPages.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p className={t.muted}>{tr('admin.pricelistPages.loading')}</p>
      ) : (
        <AdminTable>
          <AdminTableHead>
            <AdminTh>{tr('admin.pricelistPages.colLabel')}</AdminTh>
            <AdminTh>{tr('admin.pricelistPages.colSlug')}</AdminTh>
            <AdminTh>{tr('admin.pricelistPages.colProducts')}</AdminTh>
            <AdminTh>{tr('admin.pricelistPages.colShareLink')}</AdminTh>
            <AdminTh>{tr('admin.pricelistPages.colActive')}</AdminTh>
            <AdminTh align="right">{tr('admin.pricelistPages.colActions')}</AdminTh>
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
                <AdminTd>{page.active ? tr('admin.pricelistPages.yes') : tr('admin.pricelistPages.no')}</AdminTd>
                <AdminTd align="right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      className="btn-secondary text-xs inline-flex items-center gap-1"
                      disabled={busy}
                      onClick={() => startEdit(page)}
                      title={tr('admin.pricelistPages.editTitle')}
                    >
                      <PencilIcon className="w-3.5 h-3.5" aria-hidden />
                      {tr('admin.pricelistPages.edit')}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={() => {
                        setEditingPage(null)
                        setPasswordPage(page)
                      }}
                    >
                      {tr('admin.pricelistPages.password')}
                    </button>
                    {page.slug !== PRICELIST_OWNER_QUERY_PLATFORM ? (
                      <>
                        <button
                          type="button"
                          className="btn-secondary text-xs"
                          disabled={busy}
                          onClick={() => toggleActive(page)}
                        >
                          {page.active
                            ? tr('admin.pricelistPages.deactivate')
                            : tr('admin.pricelistPages.activate')}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          disabled={busy || page.itemCount > 0}
                          title={
                            page.itemCount > 0
                              ? tr('admin.pricelistPages.deleteDisabledTitle')
                              : tr('admin.pricelistPages.deleteTitle')
                          }
                          onClick={() => void handleDelete(page)}
                        >
                          {tr('admin.pricelistPages.delete')}
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
              {formatMessage(tr('admin.pricelistPages.sharePasswordSection'), {
                label: passwordPage.label,
              })}
            </h2>
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => setPasswordPage(null)}
            >
              {tr('admin.pricelistPages.close')}
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
