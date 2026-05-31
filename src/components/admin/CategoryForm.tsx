'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { slugifyCategory } from '@/lib/category-slug'
import { parseJsonResponse } from '@/lib/fetch-json'
import { appPath } from '@/lib/paths'
import { useAppTheme } from '@/lib/theme-classes'

type CategoryFormProps = {
  categoryId?: string
  initialName?: string
  initialSlug?: string
}

type CategoryRecord = {
  id: string
  name: string
  slug: string
  description?: string | null
  parent_id?: string | null
  parent_name?: string | null
  active?: number | boolean
}

type ParentOption = { id: string; name: string; parent_id?: string | null }

export default function CategoryForm({
  categoryId,
  initialName = '',
  initialSlug = '',
}: CategoryFormProps) {
  const router = useRouter()
  const t = useAppTheme()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const isEdit = Boolean(categoryId)

  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [slugManual, setSlugManual] = useState(Boolean(initialSlug))
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [parentOptions, setParentOptions] = useState<ParentOption[]>([])
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isAdmin || !user) return
    fetch(appPath('/api/admin/categories'), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return
        setParentOptions(
          data
            .filter((c: ParentOption) => !c.parent_id)
            .map((c: ParentOption) => ({ id: c.id, name: c.name, parent_id: c.parent_id }))
        )
      })
      .catch(() => {})
  }, [isAdmin, user])

  useEffect(() => {
    if (!isEdit || !categoryId || authLoading || !isAdmin || !user) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(appPath(`/api/admin/categories/${categoryId}`), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await parseJsonResponse<CategoryRecord & { error?: string }>(res)
        if (!res.ok) throw new Error(data.error || 'Failed to load category')
        setName(data.name)
        setSlug(data.slug)
        setSlugManual(true)
        setDescription(data.description ? String(data.description) : '')
        setParentId(data.parent_id ? String(data.parent_id) : '')
        setActive(data.active === false || data.active === 0 ? false : true)
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Load failed')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [categoryId, isEdit, isAdmin, authLoading, user])

  const onNameChange = (value: string) => {
    setName(value)
    if (!slugManual) setSlug(slugifyCategory(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin || !user) {
      setError('Admin access required')
      return
    }

    setSaving(true)
    setError(null)
    const payload = {
      name,
      slug,
      description,
      active,
      parent_id: parentId || null,
    }
    const url = isEdit
      ? appPath(`/api/admin/categories/${categoryId}`)
      : appPath('/api/admin/categories')
    const method = isEdit ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...adminAuthHeaders(user),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })
      const data = await parseJsonResponse<{ error?: string }>(res)
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Save failed')
        return
      }
      router.push(appPath('/admin/categories'))
      router.refresh()
    } catch {
      setError('Network error — could not save category')
    } finally {
      setSaving(false)
    }
  }

  const selectableParents = parentOptions.filter((p) => p.id !== categoryId)

  if (!isAdmin) {
    return (
      <p className="text-red-400 text-sm">Only admin users can manage categories.</p>
    )
  }

  if (loading) {
    return <p className={t.muted}>Loading category...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 max-w-xl">
      {error && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            t.isDark
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : 'border-red-300 bg-red-50 text-red-700'
          }`}
          role="alert"
        >
          {error}
        </div>
      )}
      <div>
        <label className="form-label">Name *</label>
        <input
          className="input w-full"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="form-label">Slug *</label>
        <input
          className="input w-full"
          value={slug}
          onChange={(e) => {
            setSlugManual(true)
            setSlug(e.target.value)
          }}
          required
        />
      </div>
      <div>
        <label className="form-label">Parent category</label>
        <select
          className="input w-full"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">None (top-level category)</option>
          {selectableParents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className={`text-xs mt-1 ${t.muted}`}>
          Choose a parent to create a subcategory (e.g. SHOES → SNEAKERS).
        </p>
      </div>
      <div>
        <label className="form-label">Description</label>
        <textarea
          className="input w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {isEdit && (
        <label className="flex items-center gap-2 form-check-label cursor-pointer">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className={`rounded ${t.isDark ? 'border-dark-500' : 'border-gray-400'}`}
          />
          Active in catalog
        </label>
      )}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create category'}
        </button>
        <Link href="/admin/categories" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  )
}
