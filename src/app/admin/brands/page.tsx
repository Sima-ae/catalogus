'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import { useAuth } from '@/lib/auth-local'
import { useAppTheme } from '@/lib/theme-classes'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import type { AdminBrandRow } from '@/lib/admin-brands'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'

export default function AdminBrandsPage() {
  const t = useAppTheme()
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth()
  const [brands, setBrands] = useState<AdminBrandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadBrands = useCallback(() => {
    if (authLoading || !isAdmin || !user) return

    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetch(appPath('/api/admin/brands'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await parseJsonResponse<{ error?: string } | AdminBrandRow[]>(r)
        if (!r.ok) {
          const err = !Array.isArray(d) && d.error ? d.error : 'Failed to load brands'
          throw new Error(err)
        }
        if (!Array.isArray(d)) throw new Error('Invalid brands response')
        setBrands(d)
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [authLoading, isAdmin, user])

  useEffect(() => {
    if (authLoading) return
    if (!isAdmin || !user) {
      setLoading(false)
      return
    }
    const cleanup = loadBrands()
    return cleanup
  }, [authLoading, isAdmin, user, loadBrands])

  const handleDelete = async (row: AdminBrandRow) => {
    if (!isSuperAdmin || !user) return
    if (!window.confirm(`Delete brand "${row.name}"? This cannot be undone.`)) return

    setDeletingId(row.id)
    setError('')
    try {
      const res = await fetch(appPath(`/api/admin/brands/${row.id}`), {
        method: 'DELETE',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      loadBrands()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <AdminPageShell title="Brands">
        <p className="text-red-400">Only admin users can view this page.</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title="Brands"
      description="Synced with the brands database table. Active brands appear in the shop brand filter."
    >
      <div className="flex justify-end mb-4">
        <Link href={appPath('/admin/brands/new')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add brand
        </Link>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : brands.length === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p className="mb-4">No brands in the database yet.</p>
          <Link href={appPath('/admin/brands/new')} className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add brand
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <p className={`${t.muted} text-sm mb-4`}>
            Showing {brands.length} brands from the database.
          </p>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${t.rowBorder}`}>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Name</th>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Slug</th>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Categories</th>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Status</th>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Description</th>
                <th className={`text-right py-3 px-4 font-medium ${t.tableHead}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className={`border-b ${t.rowBorder}`}>
                  <td className={`py-3 px-4 font-semibold ${t.tableCell}`}>{b.name}</td>
                  <td className={`py-3 px-4 font-mono text-sm ${t.body}`}>{b.slug}</td>
                  <td className={`py-3 px-4 text-sm ${t.body}`}>
                    {b.categories?.length ? b.categories.join(', ') : '—'}
                  </td>
                  <td className={`py-3 px-4 ${t.body}`}>{b.active ? 'Active' : 'Inactive'}</td>
                  <td className={`py-3 px-4 max-w-xs truncate ${t.muted}`}>{b.description || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={appPath(`/admin/brands/${b.id}`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.body} ${t.rowHover}`}
                      >
                        <EyeIcon className="w-4 h-4" />
                        View
                      </Link>
                      <Link
                        href={appPath(`/admin/brands/${b.id}/edit`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.body} ${t.rowHover}`}
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </Link>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          disabled={deletingId === b.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                            t.isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                          } disabled:opacity-50`}
                        >
                          <TrashIcon className="w-4 h-4" />
                          {deletingId === b.id ? '…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminPageShell>
  )
}
