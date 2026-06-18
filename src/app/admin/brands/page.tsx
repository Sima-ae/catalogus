'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { EyeIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import AdminPageShell from '@/components/admin/AdminPageShell'
import { useAuth } from '@/lib/auth-local'
import { useAppTheme } from '@/lib/theme-classes'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import type { AdminBrandRow } from '@/lib/admin-brands'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'
import {
  firstIndexLetter,
  indexLettersFromLabels,
  matchesSearchQuery,
} from '@/lib/searchable-list'

function brandSearchHaystack(row: AdminBrandRow): string {
  return [row.name, row.slug, row.description ?? '', ...(row.categories ?? [])].join(' ')
}

export default function AdminBrandsPage() {
  const t = useAppTheme()
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth()
  const [brands, setBrands] = useState<AdminBrandRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [letterFilter, setLetterFilter] = useState<string | null>(null)

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

  const indexLetters = useMemo(
    () => indexLettersFromLabels(brands.map((b) => b.name)),
    [brands]
  )

  const filteredBrands = useMemo(() => {
    let list = brands
    if (letterFilter) {
      list = list.filter((b) => firstIndexLetter(b.name) === letterFilter)
    }
    const q = searchQuery.trim()
    if (!q) return list
    return list.filter((b) => matchesSearchQuery(brandSearchHaystack(b), q))
  }, [brands, letterFilter, searchQuery])

  const searchInputClass = `w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500 ${
    t.isDark
      ? 'border-dark-600 bg-dark-800 text-gray-100 placeholder:text-gray-500'
      : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
  }`

  if (!isAdmin) {
    return (
      <AdminPageShell titleKey="admin.nav.brands">
        <p className="text-red-400">Only admin users can view this page.</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell
      titleKey="admin.nav.brands"
      actions={
        <Link href={appPath('/admin/brands/new')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add brand
        </Link>
      }
    >
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
        <div className="space-y-3">
          <div className="space-y-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search brands…"
              className={searchInputClass}
              aria-label="Search brands"
            />
            {indexLetters.length > 3 ? (
              <div className="flex flex-wrap gap-0.5" role="toolbar" aria-label="Filter by letter">
                {indexLetters.map((letter) => {
                  const active = letterFilter === letter
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => setLetterFilter(active ? null : letter)}
                      className={`min-w-[1.25rem] rounded px-1 py-0.5 text-[10px] font-semibold leading-none ${
                        active
                          ? t.isDark
                            ? 'bg-primary-500/30 text-white'
                            : 'bg-primary-100 text-primary-800'
                          : t.isDark
                            ? 'text-gray-300 hover:bg-dark-600'
                            : 'text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {letter}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          {filteredBrands.length === 0 ? (
            <div className={`card text-center py-12 ${t.muted}`}>
              <p>No brands match your search.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
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
                  {filteredBrands.map((b) => (
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
        </div>
      )}
    </AdminPageShell>
  )
}
