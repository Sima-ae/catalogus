'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/types'
import { appPath } from '@/lib/paths'

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
  author: 'TripleZero iT',
  author_icon: 'i',
  sku: '',
  status: 'active',
  featured: false,
  version: '',
  license_type: '',
  demo_url: '',
  documentation_url: '',
  download_url: '',
}

type Props = {
  mode: 'create' | 'edit'
  productId?: string
  initial?: Partial<Product>
}

export default function ProductForm({ mode, productId, initial }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(defaultForm)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    fetch(appPath(`/api/products/${productId}`))
      .then((r) => {
        if (!r.ok) throw new Error('Product not found')
        return r.json()
      })
      .then((p: Product) => setForm(mapProductToForm(p)))
      .catch(() => setError('Could not load product'))
      .finally(() => setLoading(false))
  }, [mode, productId, initial])

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

    const payload = {
      ...form,
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
    }

    const url =
      mode === 'create'
        ? appPath('/api/products')
        : appPath(`/api/products/${productId}`)
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Save failed')
        return
      }
      router.push('/admin/products')
      router.refresh()
    } catch {
      setError('Network error — could not save product')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-gray-400">Loading product...</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">Basic info</h2>
        <Field label="Name *" name="name" value={form.name} onChange={onChange} required />
        <Field
          label="Description *"
          name="description"
          value={form.description}
          onChange={onChange}
          multiline
          required
        />
        <Field
          label="Short description"
          name="short_description"
          value={form.short_description}
          onChange={onChange}
          multiline
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Price (€) *" name="price" type="number" step="0.01" value={form.price} onChange={onChange} required />
          <Field label="Original price (€)" name="original_price" type="number" step="0.01" value={form.original_price} onChange={onChange} />
        </div>
        <Field label="Image URL *" name="image_url" value={form.image_url} onChange={onChange} required />
        <div>
          <label className="block text-sm text-gray-400 mb-1">Category *</label>
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
          <p className="text-xs text-gray-500 mt-1">
            <Link href="/admin/categories/new" className="text-primary-400 hover:underline">
              Add a new category
            </Link>
          </p>
        </div>
        <Field label="Tags (comma-separated)" name="tags" value={form.tags} onChange={onChange} />
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">Author & catalog</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Author" name="author" value={form.author} onChange={onChange} />
          <Field label="Author icon (1 char)" name="author_icon" maxLength={1} value={form.author_icon} onChange={onChange} />
        </div>
        <Field label="SKU" name="sku" value={form.sku} onChange={onChange} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Status</label>
            <select name="status" value={form.status} onChange={onChange} className="input w-full">
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pt-8 text-gray-300">
            <input type="checkbox" name="featured" checked={form.featured} onChange={onChange} className="rounded" />
            Featured product
          </label>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">Links & version</h2>
        <Field label="Version" name="version" value={form.version} onChange={onChange} />
        <Field label="License type" name="license_type" value={form.license_type} onChange={onChange} />
        <Field label="Demo URL" name="demo_url" value={form.demo_url} onChange={onChange} />
        <Field label="Documentation URL" name="documentation_url" value={form.documentation_url} onChange={onChange} />
        <Field label="Download URL" name="download_url" value={form.download_url} onChange={onChange} />
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : mode === 'create' ? 'Create product' : 'Save changes'}
        </button>
        <Link href="/admin/products" className="btn-secondary">
          Cancel
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
    author: p.author || 'TripleZero iT',
    author_icon: p.author_icon || 'i',
    sku: p.sku || '',
    status: p.status || 'active',
    featured: !!p.featured,
    version: p.version || '',
    license_type: p.license_type || '',
    demo_url: p.demo_url || '',
    documentation_url: p.documentation_url || '',
    download_url: p.download_url || '',
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
  required?: boolean
}) {
  const common = {
    name,
    id: name,
    value: typeof value === 'boolean' ? '' : value,
    onChange,
    required,
    className: 'input w-full',
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm text-gray-400 mb-1">
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={4} />
      ) : (
        <input {...common} type={type} step={step} maxLength={maxLength} />
      )}
    </div>
  )
}
