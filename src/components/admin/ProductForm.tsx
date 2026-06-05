'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Product } from '@/lib/types'
import { appPath } from '@/lib/paths'
import {
  APP_DEFAULT_AUTHOR,
  APP_DEFAULT_AUTHOR_ICON,
  APP_DEFAULT_PRODUCT_VERSION,
  resolveProductVersion,
} from '@/lib/brand'
import { arrayToLines, parseProductBody, pipeToLines } from '@/lib/product-body'
import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'
import { useAuth } from '@/lib/auth-local'
import { catalogAuthHeaders } from '@/lib/catalog-fetch'
import { buildCategoryPickerOptions, type CategoryPickerOption } from '@/lib/category-picker'
import {
  joinBrandNames,
  joinCategoryNames,
  parseBrandCompound,
  parseCategoryCompound,
} from '@/lib/product-taxonomy'
import ProductImageGalleryEditor from '@/components/admin/ProductImageGalleryEditor'
import TaxonomyCheckboxList from '@/components/admin/TaxonomyCheckboxList'

type BrandOption = { id: string; name: string; slug: string }

const defaultForm = {
  name: '',
  description: '',
  short_description: '',
  price: '',
  original_price: '',
  image_url: '',
  category: '',
  brand: '',
  tags: '',
  author: APP_DEFAULT_AUTHOR,
  author_icon: APP_DEFAULT_AUTHOR_ICON,
  sku: '',
  status: 'active',
  featured: false,
  version: APP_DEFAULT_PRODUCT_VERSION,
  license_type: '',
  demo_url: '',
  documentation_url: '',
  download_url: '',
  support_url: '',
  gallery_images: '',
  features: '',
  requirements: '',
  compatibility: '',
  available_sizes: '',
  available_colors: '',
  source_url: '',
  source_album_id: '',
  rating: '',
  review_count: '',
  download_count: '',
}

type Props = {
  mode: 'create' | 'edit'
  productId?: string
  initial?: Partial<Product>
  portal?: 'admin' | 'seller'
  variant?: 'page' | 'modal'
  onSaved?: (product: Product) => void
  onCancel?: () => void
}

export default function ProductForm({
  mode,
  productId,
  initial,
  portal = 'admin',
  variant = 'page',
  onSaved,
  onCancel,
}: Props) {
  const router = useRouter()
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const { user } = useAuth()
  const isSeller = portal === 'seller'
  const productsPath = isSeller ? '/seller/products' : '/admin/products'
  const authHeaders = useMemo(() => catalogAuthHeaders(user), [user])
  const [form, setForm] = useState(defaultForm)
  const [categories, setCategories] = useState<CategoryPickerOption[]>([])
  const [brands, setBrands] = useState<BrandOption[]>([])
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(appPath('/api/categories'))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(
            buildCategoryPickerOptions(
              data.map(
                (c: {
                  id: string
                  name: string
                  parent_id?: string | null
                  parent_name?: string | null
                }) => ({
                  id: c.id,
                  name: c.name,
                  parent_id: c.parent_id,
                  parent_name: c.parent_name,
                })
              )
            )
          )
        }
      })
      .catch(() => {})
    fetch(appPath('/api/brands'))
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBrands(data)
      })
      .catch(() => {})
  }, [])

  const categoryOrder = useMemo(() => categories.map((c) => c.name), [categories])
  const brandOrder = useMemo(() => brands.map((b) => b.name), [brands])

  const applyTaxonomyFromStrings = (category: string, brand: string) => {
    setSelectedCategories(new Set(parseCategoryCompound(category)))
    setSelectedBrands(new Set(parseBrandCompound(brand)))
  }

  useEffect(() => {
    if (mode === 'create' && initial) {
      const mapped = mapProductToForm(initial)
      setForm((f) => ({ ...f, ...mapped }))
      applyTaxonomyFromStrings(mapped.category, mapped.brand)
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
        const mapped = mapProductToForm(p)
        setForm(mapped)
        applyTaxonomyFromStrings(mapped.category, mapped.brand)
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

    if (!form.image_url.trim()) {
      setError('Main image is required')
      setSaving(false)
      return
    }

    if (selectedCategories.size === 0) {
      setError(tr('productForm.selectCategory'))
      setSaving(false)
      return
    }

    const category = joinCategoryNames(selectedCategories, categoryOrder)
    const brand =
      selectedBrands.size > 0 ? joinBrandNames(selectedBrands, brandOrder) : null

    const payload = parseProductBody({
      ...form,
      category,
      brand,
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
        setError(
          typeof data.error === 'string' && data.error !== 'Save failed'
            ? data.error
            : tr('productForm.errorSaveFailed')
        )
        return
      }
      const updated = data as Product
      const mapped = mapProductToForm(updated)
      setForm(mapped)
      applyTaxonomyFromStrings(mapped.category, mapped.brand)
      setSaved(true)
      onSaved?.(updated)
      if (mode === 'create' && variant === 'page') {
        router.push(appPath(productsPath))
        router.refresh()
      }
    } catch {
      setError(tr('productForm.errorNetwork'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className={t.muted}>{tr('loading.generic')}</p>
  }

  const saveLabel = saving
    ? tr('productForm.saving')
    : mode === 'create'
      ? tr('productForm.createProduct')
      : tr('productForm.saveChanges')

  const formActions = (
    <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
      <button type="submit" className="btn-primary" disabled={saving}>
        {saveLabel}
      </button>
      {variant === 'modal' ? (
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
          {tr('productForm.cancel')}
        </button>
      ) : (
        <Link href={appPath(productsPath)} className="btn-secondary">
          {mode === 'edit' ? tr('productForm.backToProducts') : tr('productForm.cancel')}
        </Link>
      )}
    </div>
  )

  return (
    <form
      onSubmit={handleSubmit}
      className={variant === 'modal' ? 'space-y-6' : 'space-y-8 max-w-3xl'}
    >
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
          {tr('productForm.savedSuccess')}
        </div>
      )}

      {variant === 'page' ? (
        <div className="flex flex-wrap items-center justify-end gap-3">{formActions}</div>
      ) : null}

      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h2 className="card-section-title mb-0">{tr('productForm.sectionBasicInfo')}</h2>
          {variant === 'modal' ? formActions : null}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 [&_.form-label]:mb-1 [&_.form-label]:text-xs">
          <div>
            <label className="form-label">{tr('productForm.category')}</label>
            <TaxonomyCheckboxList
              options={categories.map((c) => ({
                id: c.id,
                name: c.name,
                label: c.label,
              }))}
              selected={selectedCategories}
              onChange={setSelectedCategories}
              disabled={saving}
              preview={
                selectedCategories.size > 0
                  ? joinCategoryNames(selectedCategories, categoryOrder)
                  : ''
              }
              emptyPreview={tr('productForm.selectCategory')}
            />
            {!isSeller && (
              <p className="text-xs mt-1 form-hint">
                <Link href="/admin/categories/new" className={t.link}>
                  {tr('productForm.addCategory')}
                </Link>
              </p>
            )}
          </div>
          <div>
            <label className="form-label">{tr('productForm.brand')}</label>
            <TaxonomyCheckboxList
              options={brands.map((b) => ({
                id: b.id,
                name: b.name,
                label: b.name,
              }))}
              selected={selectedBrands}
              onChange={setSelectedBrands}
              disabled={saving}
              preview={
                selectedBrands.size > 0
                  ? joinBrandNames(selectedBrands, brandOrder)
                  : tr('productForm.noBrand')
              }
            />
            {!isSeller && (
              <p className="text-xs mt-1 form-hint">
                <Link href="/admin/brands/new" className={t.link}>
                  {tr('productForm.addBrand')}
                </Link>
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={tr('productForm.name')} name="name" value={form.name} onChange={onChange} required />
          <Field label={tr('productForm.tags')} name="tags" value={form.tags} onChange={onChange} />
        </div>
        <Field
          label={tr('productForm.shortDescription')}
          name="short_description"
          value={form.short_description}
          onChange={onChange}
          multiline
          required
        />
      </section>

      <section className="card space-y-4">
        <h2 className="card-section-title">{tr('productForm.sectionImages')}</h2>
        <ProductImageGalleryEditor
          imageUrl={form.image_url}
          galleryLines={form.gallery_images}
          sourceUrl={form.source_url}
          productId={mode === 'edit' ? productId : undefined}
          authHeaders={authHeaders}
          onChange={({ image_url, gallery_images }) =>
            setForm((prev) => ({ ...prev, image_url, gallery_images }))
          }
        />
        {!form.image_url.trim() ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {tr('productForm.imageRequired')}
          </p>
        ) : null}
      </section>

      <section className="card space-y-4">
        <h2 className="card-section-title">
          {tr('productForm.sectionInformation')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">{tr('productForm.status')}</label>
            <select name="status" value={form.status} onChange={onChange} className="input w-full">
              <option value="active">{tr('productForm.statusActive')}</option>
              <option value="draft">{tr('productForm.statusDraft')}</option>
              <option value="inactive">{tr('productForm.statusInactive')}</option>
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
              {tr('productForm.featured')}
            </label>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 [&_.form-label]:mb-1 [&_.form-label]:text-xs [&_input]:py-1.5 [&_input]:text-sm">
          <Field
            label={tr('productForm.price')}
            name="price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={onChange}
            required
          />
          <Field
            label={tr('productForm.originalPrice')}
            name="original_price"
            type="number"
            step="0.01"
            value={form.original_price}
            onChange={onChange}
          />
        </div>
        <div>
          <Field label={tr('productForm.sku')} name="sku" value={form.sku} onChange={onChange} required />
          <p className={`mt-1 text-xs ${t.muted}`}>{tr('productForm.skuHint')}</p>
        </div>
      </section>

      {!isSeller && (
        <section className="card space-y-4">
          <h2 className="card-section-title">{tr('productForm.sectionVariants')}</h2>
          <Field
            label={tr('productForm.sizes')}
            name="available_sizes"
            value={form.available_sizes}
            onChange={onChange}
            multiline
            rows={3}
            placeholder="39&#10;40&#10;41"
          />
          <Field
            label={tr('productForm.colors')}
            name="available_colors"
            value={form.available_colors}
            onChange={onChange}
            multiline
            rows={3}
          />
          <Field
            label={tr('productForm.sourceUrl')}
            name="source_url"
            value={form.source_url}
            onChange={onChange}
            placeholder="https://..."
          />
          <Field
            label={tr('productForm.sourceAlbumId')}
            name="source_album_id"
            value={form.source_album_id}
            onChange={onChange}
          />
        </section>
      )}

      <section className="card space-y-4">
        <h2 className="card-section-title">{tr('productForm.sectionTabs')}</h2>
        <p className="form-hint">{tr('productForm.tabsHint')}</p>
        <Field
          label={tr('productForm.features')}
          name="features"
          value={form.features}
          onChange={onChange}
          multiline
          rows={6}
        />
        <Field
          label={tr('productForm.requirements')}
          name="requirements"
          value={form.requirements}
          onChange={onChange}
          multiline
          rows={5}
        />
        <Field
          label={tr('productForm.compatibility')}
          name="compatibility"
          value={form.compatibility}
          onChange={onChange}
          multiline
          rows={2}
        />
      </section>

      {!isSeller && (
        <section className="card space-y-4">
          <h2 className="card-section-title">{tr('productForm.sectionStats')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={tr('productForm.author')} name="author" value={form.author} onChange={onChange} />
            <Field
              label={tr('productForm.authorIcon')}
              name="author_icon"
              maxLength={1}
              value={form.author_icon}
              onChange={onChange}
            />
          </div>
          <p className="form-hint">
            {tr('productForm.statsHintPrefix')}
            <Link href="/admin/reviews" className={t.link}>
              {tr('productForm.statsHintLink')}
            </Link>
            {tr('productForm.statsHintSuffix')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label={tr('productForm.rating')}
              name="rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={onChange}
            />
            <Field
              label={tr('productForm.reviewCount')}
              name="review_count"
              type="number"
              min="0"
              value={form.review_count}
              onChange={onChange}
            />
            <Field
              label={tr('productForm.downloadCount')}
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
        <h2 className="card-section-title">{tr('productForm.sectionLinks')}</h2>
        <Field label={tr('productForm.version')} name="version" value={form.version} onChange={onChange} />
        <Field label={tr('productForm.licenseType')} name="license_type" value={form.license_type} onChange={onChange} />
        <Field label={tr('productForm.demoUrl')} name="demo_url" value={form.demo_url} onChange={onChange} />
        <Field label={tr('productForm.documentationUrl')} name="documentation_url" value={form.documentation_url} onChange={onChange} />
        <Field label={tr('productForm.supportUrl')} name="support_url" value={form.support_url} onChange={onChange} />
        <Field label={tr('productForm.downloadUrl')} name="download_url" value={form.download_url} onChange={onChange} />
      </section>

      {formActions}
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
    brand: p.brand || '',
    tags,
    author: p.author || APP_DEFAULT_AUTHOR,
    author_icon: p.author_icon || APP_DEFAULT_AUTHOR_ICON,
    sku: p.sku || '',
    status: p.status || 'active',
    featured: !!p.featured,
    version: resolveProductVersion(p.version),
    license_type: p.license_type || '',
    demo_url: p.demo_url || '',
    documentation_url: p.documentation_url || '',
    download_url: p.download_url || '',
    support_url: p.support_url || '',
    gallery_images: arrayToLines(p.gallery_images),
    features: arrayToLines(p.features),
    requirements: arrayToLines(p.requirements),
    compatibility: p.compatibility || '',
    available_sizes: pipeToLines(p.available_sizes),
    available_colors: pipeToLines(p.available_colors),
    source_url: p.source_url || '',
    source_album_id: p.source_album_id || '',
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
