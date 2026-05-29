'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/types'
import { appPath } from '@/lib/paths'
import { APP_DEFAULT_AUTHOR, APP_DEFAULT_AUTHOR_ICON } from '@/lib/brand'
import { arrayToLines, parseProductBody } from '@/lib/product-body'
import { useAppTheme } from '@/lib/theme-classes'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'

type CategoryOption = { id: string; name: string; slug: string }

const defaultForm = {
  name: '',
  description: '',
  short_description: '',
  price: '',
  original_price: '',
  image_url: '',
  category: '',
  tags: '',
  author: APP_DEFAULT_AUTHOR,
  author_icon: APP_DEFAULT_AUTHOR_ICON,
  sku: '',
  status: 'active',
  featured: false,
  version: '',
  license_type: '',
  demo_url: '',
  documentation_url: '',
  download_url: '',
  support_url: '',
  gallery_images: '',
  features: '',
  requirements: '',
  compatibility: '',
  rating: '',
  review_count: '',
  download_count: '',
}

type Props = {
  mode: 'create' | 'edit'
  productId?: string
  initial?: Partial<Product>
  portal?: 'admin' | 'seller'
}

export default function ProductForm({
  mode,
  productId,
  initial,
  portal = 'admin',
}: Props) {
  const router = useRouter()
  const t = useAppTheme()
  const { user } = useAuth()
  const isSeller = portal === 'seller'
  const productsPath = isSeller ? '/seller/products' : '/admin/products'
  const authHeaders = useMemo(() => catalogAuthHeaders(user), [user])
  const [form, setForm] = useState(defaultForm)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(appPath('/api/categories'))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (mode === 'create' && initial) {
      setForm((f) => ({ ...f, ...mapProductToForm(initial) }))
      setLoading(false)
      return
    }
    if (mode !== 'edit' || !productId) return

    const controller = new AbortController()
    fetch(appPath(`/api/products/${productId}`), {
      cache: 'no-store',
      signal: controller.signal,
      headers: authHeaders,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Product not found')
        return r.json()
      })
      .then((p: Product) => {
        setForm(mapProductToForm(p))
        setSaved(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setError('Could not load product')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [mode, productId, initial, authHeaders])

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    if (!form.sku.trim()) {
      setError('SKU is required')
      setSaving(false)
      return
    }

    const payload = parseProductBody({
      ...form,
      price: form.price,
      original_price: form.original_price,
    } as Record<string, unknown>)

    const url =
      mode === 'create'
        ? appPath('/api/products')
        : appPath(`/api/products/${productId}`)
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Save failed')
        return
      }
      const updated = data as Product
      setForm(mapProductToForm(updated))
      setSaved(true)
      if (mode === 'create') {
        router.push(appPath(productsPath))
        router.refresh()
      }
    } catch {
      setError('Network error — could not save product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className={t.muted}>Loading product...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            t.isDark
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : 'border-red-300 bg-red-50 text-red-800'
          }`}
          role="alert"
        >
          {error}
        </div>
      )}
      {saved && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            t.isDark
              ? 'border-green-500/40 bg-green-500/10 text-green-300'
              : 'border-green-300 bg-green-50 text-green-800'
          }`}
          role="status"
        >
          Product saved. Tab content and stats are stored in the database.
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="card-section-title">Basic info</h2>
        <Field label="Name *" name="name" value={form.name} onChange={onChange} required />
        <Field
          label="Short description *"
          name="short_description"
          value={form.short_description}
          onChange={onChange}
          multiline
          required
        />
        <Field
          label="Description"
          name="description"
          value={form.description}
          onChange={onChange}
          multiline
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Price (€) *" name="price" type="number" step="0.01" value={form.price} onChange={onChange} required />
          <Field label="Original price (€)" name="original_price" type="number" step="0.01" value={form.original_price} onChange={onChange} />
        </div>
        <div>
          <label className="form-label">Category *</label>
          <select
            name="category"
            value={form.category}
            onChange={onChange}
            required
            className="input w-full"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
            {form.category && !categories.some((c) => c.name === form.category) && (
              <option value={form.category}>{form.category}</option>
            )}
          </select>
          {!isSeller && (
            <p className="text-xs mt-1 form-hint">
              <Link href="/admin/categories/new" className={t.link}>
                Add a new category
              </Link>
            </p>
          )}
        </div>
        <Field label="Tags (comma-separated)" name="tags" value={form.tags} onChange={onChange} />
      </section>

      <section className="card space-y-4">
        <h2 className="card-section-title">Images</h2>
        <p className="form-hint">
          Main image is used in the shop grid and as the first slide on the product page. Add more URLs
          below for the thumbnail gallery (one URL per line).
        </p>
        <Field
          label="Main image URL *"
          name="image_url"
          value={form.image_url}
          onChange={onChange}
          required
        />
        <Field
          label="Additional gallery image URLs"
          name="gallery_images"
          value={form.gallery_images}
          onChange={onChange}
          multiline
          rows={5}
          placeholder={'https://example.com/image-2.jpg\nhttps://example.com/image-3.jpg'}
        />
      </section>

      <section className="card space-y-4">
        <h2 className="card-section-title">{isSeller ? 'Catalog' : 'Author & catalog'}</h2>
        {!isSeller && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Author" name="author" value={form.author} onChange={onChange} />
            <Field
              label="Author icon (1 char)"
              name="author_icon"
              maxLength={1}
              value={form.author_icon}
              onChange={onChange}
            />
          </div>
        )}
        <div>
          <Field label="SKU" name="sku" value={form.sku} onChange={onChange} required />
          <p className={`mt-1 text-xs ${t.muted}`}>
            Required. Must be unique across all products (not case-sensitive).
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Status</label>
            <select name="status" value={form.status} onChange={onChange} className="input w-full">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {!isSeller && (
            <label className="flex items-center gap-2 pt-8 form-check-label cursor-pointer">
              <input
                type="checkbox"
                name="featured"
                checked={form.featured}
                onChange={onChange}
                className="rounded"
              />
              Featured product
            </label>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="card-section-title">Product page tabs</h2>
        <p className="form-hint">
          Content shown under Features, Requirements, and Support on the public product page.
        </p>
        <Field
          label="Features (one per line)"
          name="features"
          value={form.features}
          onChange={onChange}
          multiline
          rows={6}
        />
        <Field
          label="Requirements (one per line)"
          name="requirements"
          value={form.requirements}
          onChange={onChange}
          multiline
          rows={5}
        />
        <Field
          label="Compatibility note"
          name="compatibility"
          value={form.compatibility}
          onChange={onChange}
          multiline
          rows={2}
        />
      </section>

      {!isSeller && (
        <section className="card space-y-4">
          <h2 className="card-section-title">Stats & reviews</h2>
          <p className="form-hint">
            Shown in the product header. Individual customer reviews are managed under{' '}
            <Link href="/admin/reviews" className={t.link}>
              Admin → Reviews
            </Link>
            .
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Rating (0–5)"
              name="rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={onChange}
            />
            <Field
              label="Review count"
              name="review_count"
              type="number"
              min="0"
              value={form.review_count}
              onChange={onChange}
            />
            <Field
              label="Download count"
              name="download_count"
              type="number"
              min="0"
              value={form.download_count}
              onChange={onChange}
            />
          </div>
        </section>
      )}

      <section className="card space-y-4">
        <h2 className="card-section-title">Links & version</h2>
        <Field label="Version" name="version" value={form.version} onChange={onChange} />
        <Field label="License type" name="license_type" value={form.license_type} onChange={onChange} />
        <Field label="Demo URL (Support tab)" name="demo_url" value={form.demo_url} onChange={onChange} />
        <Field label="Documentation URL (Support tab)" name="documentation_url" value={form.documentation_url} onChange={onChange} />
        <Field label="Support URL (Support tab)" name="support_url" value={form.support_url} onChange={onChange} />
        <Field label="Download URL" name="download_url" value={form.download_url} onChange={onChange} />
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Create product' : 'Save changes'}
        </button>
        <Link href={appPath(productsPath)} className="btn-secondary">
          {mode === 'edit' ? 'Back to products' : 'Cancel'}
        </Link>
      </div>
    </form>
  )
}

function mapProductToForm(p: Partial<Product>) {
  const tags = Array.isArray(p.tags) ? p.tags.join(', ') : ''
  return {
    name: p.name || '',
    description: p.description || '',
    short_description: p.short_description || '',
    price: p.price != null ? String(p.price) : '',
    original_price: p.original_price != null ? String(p.original_price) : '',
    image_url: p.image_url || '',
    category: p.category || '',
    tags,
    author: p.author || APP_DEFAULT_AUTHOR,
    author_icon: p.author_icon || APP_DEFAULT_AUTHOR_ICON,
    sku: p.sku || '',
    status: p.status || 'active',
    featured: !!p.featured,
    version: p.version || '',
    license_type: p.license_type || '',
    demo_url: p.demo_url || '',
    documentation_url: p.documentation_url || '',
    download_url: p.download_url || '',
    support_url: p.support_url || '',
    gallery_images: arrayToLines(p.gallery_images),
    features: arrayToLines(p.features),
    requirements: arrayToLines(p.requirements),
    compatibility: p.compatibility || '',
    rating: p.rating != null ? String(p.rating) : '',
    review_count: p.review_count != null ? String(p.review_count) : '',
    download_count: p.download_count != null ? String(p.download_count) : '',
  }
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  step,
  maxLength,
  multiline,
  rows = 4,
  min,
  max,
  placeholder,
  required,
}: {
  label: string
  name: string
  value: string | boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  type?: string
  step?: string
  maxLength?: number
  multiline?: boolean
  rows?: number
  min?: string
  max?: string
  placeholder?: string
  required?: boolean
}) {
  const common = {
    name,
    id: name,
    value: typeof value === 'boolean' ? '' : value,
    onChange,
    required,
    placeholder,
    className: 'input w-full',
  }

  return (
    <div>
      <label htmlFor={name} className="form-label">
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={rows} />
      ) : (
        <input {...common} type={type} step={step} min={min} max={max} maxLength={maxLength} />
      )}
    </div>
  )
}
