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

type BrandFormProps = {
  brandId?: string
  initialName?: string
  initialSlug?: string
  readOnly?: boolean
}

type CategoryOption = { id: string; name: string; slug: string }

type BrandRecord = {
  id: string
  name: string
  slug: string
  description?: string | null
  active?: number | boolean
  category_ids?: string[]
  categories?: { id: string; name: string }[]
}

export default function BrandForm({
  brandId,
  initialName = '',
  initialSlug = '',
  readOnly = false,
}: BrandFormProps) {
  const router = useRouter()
  const t = useAppTheme()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const isEdit = Boolean(brandId)

  const [name, setName] = useState(initialName)
  const [slug, setSlug] = useState(initialSlug)
  const [slugManual, setSlugManual] = useState(Boolean(initialSlug))
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(appPath('/api/categories'))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAllCategories(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit || !brandId || authLoading || !isAdmin || !user) return

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(appPath(`/api/admin/brands/${brandId}`), {
      headers: adminAuthHeaders(user),
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await parseJsonResponse<BrandRecord & { error?: string }>(res)
        if (!res.ok) throw new Error(data.error || 'Failed to load brand')
        setName(data.name)
        setSlug(data.slug)
        setSlugManual(true)
        setDescription(data.description ? String(data.description) : '')
        setActive(data.active === false || data.active === 0 ? false : true)
        const ids =
          data.category_ids ??
          data.categories?.map((c) => c.id) ??
          []
        setCategoryIds(ids)
      })
      .catch((e) => {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : 'Load failed')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [brandId, isEdit, isAdmin, authLoading, user])

  const onNameChange = (value: string) => {
    setName(value)
    if (!slugManual) setSlug(slugifyCategory(value))
  }

  const toggleCategory = (id: string) => {
    setCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const selectedCategoryNames = allCategories
    .filter((c) => categoryIds.includes(c.id))
    .map((c) => c.name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (readOnly) return
    if (!isAdmin || !user) {
      setError('Admin access required')
      return
    }

    setSaving(true)
    setError(null)
    const payload = { name, slug, description, active, category_ids: categoryIds }
    const url = isEdit
      ? appPath(`/api/admin/brands/${brandId}`)
      : appPath('/api/admin/brands')
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
      router.push(appPath('/admin/brands'))
      router.refresh()
    } catch {
      setError('Network error — could not save brand')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return <p className="text-red-400 text-sm">Only admin users can manage brands.</p>
  }

  if (loading) {
    return <p className={t.muted}>Loading brand...</p>
  }

  const categoryPicker = (
    <div>
      <label className="form-label">Categories</label>
      <p className={`text-xs mb-2 ${t.muted}`}>
        Select one or more categories for this brand. The same brand can be linked to multiple
        categories (e.g. Rolex on Watches and Accessories).
      </p>
      {allCategories.length === 0 ? (
        <p className={`text-sm ${t.muted}`}>
          No categories yet.{' '}
          <Link href={appPath('/admin/categories/new')} className={t.link}>
            Add a category
          </Link>{' '}
          first.
        </p>
      ) : readOnly ? (
        <p className={t.body}>
          {selectedCategoryNames.length ? selectedCategoryNames.join(', ') : 'All categories (none selected)'}
        </p>
      ) : (
        <div
          className={`max-h-48 overflow-y-auto rounded-lg border p-3 space-y-2 ${
            t.isDark ? 'border-dark-600 bg-dark-800' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {allCategories.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 text-sm cursor-pointer form-check-label"
            >
              <input
                type="checkbox"
                checked={categoryIds.includes(c.id)}
                onChange={() => toggleCategory(c.id)}
                className={`rounded ${t.isDark ? 'border-dark-500' : 'border-gray-400'}`}
              />
              {c.name}
            </label>
          ))}
        </div>
      )}
    </div>
  )

  if (readOnly) {
    return (
      <div className="card space-y-4 max-w-xl">
        <div>
          <p className={`text-xs uppercase tracking-wide ${t.muted}`}>Name</p>
          <p className={`text-lg font-semibold ${t.body}`}>{name}</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wide ${t.muted}`}>Slug</p>
          <p className={`font-mono ${t.body}`}>{slug}</p>
        </div>
        <div>
          <p className={`text-xs uppercase tracking-wide ${t.muted}`}>Description</p>
          <p className={t.body}>{description || '—'}</p>
        </div>
        {categoryPicker}
        <div>
          <p className={`text-xs uppercase tracking-wide ${t.muted}`}>Status</p>
          <p className={t.body}>{active ? 'Active' : 'Inactive'}</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Link href={appPath(`/admin/brands/${brandId}/edit`)} className="btn-primary">
            Edit
          </Link>
          <Link href={appPath('/admin/brands')} className="btn-secondary">
            Back to list
          </Link>
        </div>
      </div>
    )
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
        <label className="form-label">Description</label>
        <textarea
          className="input w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {categoryPicker}
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
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create brand'}
        </button>
        <Link href={appPath('/admin/brands')} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  )
}
