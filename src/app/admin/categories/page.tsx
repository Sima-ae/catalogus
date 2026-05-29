'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import { useAuth } from '@/lib/auth-local'
import { useAppTheme } from '@/lib/theme-classes'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import type { AdminCategoryRow } from '@/lib/admin-categories'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'

export default function AdminCategoriesPage() {
  const t = useAppTheme()
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth()
  const [categories, setCategories] = useState<AdminCategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadCategories = useCallback(() => {
    if (authLoading || !isAdmin || !user) {
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    fetch(appPath('/api/admin/categories'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await parseJsonResponse<{ error?: string } | AdminCategoryRow[]>(r)
        if (!r.ok) {
          const err = !Array.isArray(d) && d.error ? d.error : 'Failed to load categories'
          throw new Error(err)
        }
        if (!Array.isArray(d)) {
          throw new Error('Invalid categories response')
        }
        setCategories(d)
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
    const cleanup = loadCategories()
    return cleanup
  }, [authLoading, isAdmin, user, loadCategories])

  const handleDelete = async (row: AdminCategoryRow) => {
    if (!isSuperAdmin || !user) return
    if (!window.confirm(`Delete category "${row.name}"? This cannot be undone.`)) return

    setDeletingId(row.id)
    setError('')
    try {
      const res = await fetch(appPath(`/api/admin/categories/${row.id}`), {
        method: 'DELETE',
        headers: adminAuthHeaders(user),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      loadCategories()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <AdminPageShell title="Categories">
        <p className="text-red-400">Only admin users can view this page.</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      title="Categories"
      description="Synced with the categories database table. Active categories appear in the shop sidebar and filters."
    >
      <div className="flex justify-end mb-4">
        <Link href={appPath('/admin/categories/new')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add category
        </Link>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className={t.muted}>Loading...</p>
      ) : categories.length === 0 ? (
        <div className={`card text-center py-12 ${t.muted}`}>
          <p className="mb-4">No categories in the database yet.</p>
          <Link href={appPath('/admin/categories/new')} className="btn-primary inline-flex items-center gap-2">
            <PlusIcon className="w-5 h-5" />
            Add category
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <p className={`${t.muted} text-sm mb-4`}>
            Showing {categories.length} categories from the database.
          </p>
          <table className="w-full">
            <thead>
              <tr className={`border-b ${t.rowBorder}`}>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Name</th>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Slug</th>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Status</th>
                <th className={`text-left py-3 px-4 font-medium ${t.tableHead}`}>Description</th>
                <th className={`text-right py-3 px-4 font-medium ${t.tableHead}`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className={`border-b ${t.rowBorder}`}>
                  <td className={`py-3 px-4 font-semibold ${t.tableCell}`}>{c.name}</td>
                  <td className={`py-3 px-4 font-mono text-sm ${t.body}`}>{c.slug}</td>
                  <td className={`py-3 px-4 ${t.body}`}>{c.active ? 'Active' : 'Inactive'}</td>
                  <td className={`py-3 px-4 max-w-xs truncate ${t.muted}`}>{c.description || '—'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={appPath(`/admin/categories/${c.id}/edit`)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${t.body} ${t.rowHover}`}
                      >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                      </Link>
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={deletingId === c.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm ${
                            t.isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                          } disabled:opacity-50`}
                        >
                          <TrashIcon className="w-4 h-4" />
                          {deletingId === c.id ? '…' : 'Delete'}
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
