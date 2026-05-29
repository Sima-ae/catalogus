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
  active?: number | boolean
}

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
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    const payload = { name, slug, description, active }
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
        <label className={`block text-sm font-medium mb-1 ${t.body}`}>Name *</label>
        <input
          className={`w-full rounded-lg border px-3 py-2 ${t.input}`}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${t.body}`}>Slug *</label>
        <input
          className={`w-full rounded-lg border px-3 py-2 ${t.input}`}
          value={slug}
          onChange={(e) => {
            setSlugManual(true)
            setSlug(e.target.value)
          }}
          required
        />
      </div>
      <div>
        <label className={`block text-sm font-medium mb-1 ${t.body}`}>Description</label>
        <textarea
          className={`w-full rounded-lg border px-3 py-2 ${t.input}`}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {isEdit && (
        <label className={`flex items-center gap-2 text-sm cursor-pointer ${t.body}`}>
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
