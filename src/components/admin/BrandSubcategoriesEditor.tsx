'use client'

import { useCallback, useEffect, useState } from 'react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { slugifyCategory } from '@/lib/category-slug'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'

type SubcategoryRow = {
  id: string
  name: string
  slug: string
  active: boolean
}

type Props = {
  brandId: string
  readOnly?: boolean
}

export default function BrandSubcategoriesEditor({ brandId, readOnly = false }: Props) {
  const t = useAppTheme()
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const [rows, setRows] = useState<SubcategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!isAdmin || !user || !brandId) return

    setLoading(true)
    setError(null)
    fetch(appPath(`/api/admin/brands/${brandId}/subcategories`), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await parseJsonResponse<SubcategoryRow[] | { error?: string }>(res)
        if (!res.ok) {
          throw new Error(!Array.isArray(data) && data.error ? data.error : 'Failed to load')
        }
        setRows(Array.isArray(data) ? data : [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [brandId, isAdmin, user])

  useEffect(() => {
    load()
  }, [load])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly || !isAdmin || !user) return
    const name = newName.trim()
    if (!name) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(appPath(`/api/admin/brands/${brandId}/subcategories`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders(user),
        },
        body: JSON.stringify({ name, slug: slugifyCategory(name) }),
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Failed to add subcategory')
      setNewName('')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (row: SubcategoryRow) => {
    if (!isSuperAdmin || !user) return
    if (!window.confirm(`Delete subcategory "${row.name}"?`)) return

    setDeletingId(row.id)
    setError(null)
    try {
      const res = await fetch(
        appPath(`/api/admin/brands/${brandId}/subcategories/${row.id}`),
        { method: 'DELETE', headers: adminAuthHeaders(user) }
      )
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${t.isDark ? 'border-dark-600 bg-dark-800/50' : 'border-gray-200 bg-gray-50'}`}>
      <h3 className={`text-sm font-semibold mb-1 ${t.heading}`}>Brand subcategories</h3>
      <p className={`text-xs mb-3 ${t.muted}`}>
        Optional segments inside this brand (e.g. MEN, WOMEN). Admin and super admin can add these.
      </p>

      {error ? <p className="text-red-500 text-sm mb-3">{error}</p> : null}

      {loading ? (
        <p className={`text-sm ${t.muted}`}>Loading subcategories…</p>
      ) : rows.length === 0 ? (
        <p className={`text-sm mb-3 ${t.muted}`}>No subcategories yet.</p>
      ) : (
        <ul className="space-y-2 mb-4">
          {rows.map((row) => (
            <li
              key={row.id}
              className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${
                t.isDark ? 'border-dark-600 bg-dark-900' : 'border-gray-200 bg-white'
              }`}
            >
              <div>
                <span className={`font-medium ${t.heading}`}>{row.name}</span>
                <span className={`ml-2 font-mono text-xs ${t.muted}`}>{row.slug}</span>
                {!row.active ? (
                  <span className={`ml-2 text-xs ${t.muted}`}>(inactive)</span>
                ) : null}
              </div>
              {isSuperAdmin && !readOnly ? (
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  disabled={deletingId === row.id}
                  className={`inline-flex items-center gap-1 text-xs ${
                    t.isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                  } disabled:opacity-50`}
                >
                  <TrashIcon className="w-4 h-4" />
                  {deletingId === row.id ? '…' : 'Delete'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && isAdmin ? (
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[10rem]">
            <label className="form-label text-xs">New subcategory</label>
            <input
              className="input w-full"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. MEN or WOMEN"
            />
          </div>
          <button type="submit" className="btn-primary text-sm inline-flex items-center gap-1" disabled={saving}>
            <PlusIcon className="w-4 h-4" />
            {saving ? 'Adding…' : 'Add'}
          </button>
        </form>
      ) : null}
    </div>
  )
}
