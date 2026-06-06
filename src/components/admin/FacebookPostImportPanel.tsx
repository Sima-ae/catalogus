'use client'

import { useMemo, useState } from 'react'
import TaxonomyCheckboxList from '@/components/admin/TaxonomyCheckboxList'
import { useAppTheme } from '@/lib/theme-classes'
import type { CategoryPickerOption } from '@/lib/category-picker'
import { joinBrandNames } from '@/lib/product-taxonomy'
import { appPath } from '@/lib/paths'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { parseJsonResponse } from '@/lib/fetch-json'
import type { AuthUser } from '@/lib/auth-local'

type BrandOption = { id: string; name: string }

type PreviewResult = {
  title?: string
  descriptionPreview?: string
  imageCount?: number
  detectedPriceHint?: number | null
  error?: string
}

type Props = {
  sourceId: string
  sourceName: string
  user: AuthUser
  categories: CategoryPickerOption[]
  brands: BrandOption[]
  disabled?: boolean
  onQueued?: () => void
  onError?: (message: string) => void
  onSyncInfo?: (info: {
    kind: 'import-facebook-post'
    job: { id: string }
    postUrl: string
    workerCommand: string
  }) => void
}

export default function FacebookPostImportPanel({
  sourceId,
  sourceName,
  user,
  categories,
  brands,
  disabled = false,
  onQueued,
  onError,
  onSyncInfo,
}: Props) {
  const t = useAppTheme()
  const [postUrl, setPostUrl] = useState('')
  const [price, setPrice] = useState('')
  const [sku, setSku] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [importing, setImporting] = useState(false)

  const brandOrder = useMemo(() => brands.map((b) => b.name), [brands])
  const brandLabel = joinBrandNames(selectedBrands, brandOrder)

  const canImport =
    postUrl.trim() &&
    sku.trim() &&
    categoryId &&
    selectedBrands.size > 0 &&
    price.trim() !== '' &&
    Number.isFinite(Number(price)) &&
    Number(price) >= 0

  const handlePreview = async () => {
    const url = postUrl.trim()
    if (!url) {
      onError?.('Enter a Facebook post URL first')
      return
    }

    setPreviewing(true)
    setPreview(null)
    try {
      const res = await fetch(appPath('/api/admin/import/facebook/preview'), {
        method: 'POST',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postUrl: url }),
      })
      const data = await parseJsonResponse<PreviewResult & { error?: string }>(res)
      if (!res.ok) throw new Error(data.error || 'Preview failed')
      setPreview(data)
      if (data.detectedPriceHint != null && !price.trim()) {
        setPrice(String(data.detectedPriceHint))
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Preview failed'
      setPreview({ error: message })
      onError?.(message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = async () => {
    if (!canImport) return

    setImporting(true)
    try {
      const categoryOption = categories.find((c) => c.id === categoryId)
      const res = await fetch(
        appPath(`/api/admin/import/sources/${sourceId}/import-facebook-post`),
        {
          method: 'POST',
          headers: {
            ...adminAuthHeaders(user),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            postUrl: postUrl.trim(),
            price: Number(price),
            sku: sku.trim(),
            category_id: categoryId,
            category: categoryOption?.listLabel || categoryOption?.name || '',
            brand: brandLabel || null,
          }),
        }
      )
      const data = await parseJsonResponse<{
        error?: string
        kind?: 'import-facebook-post'
        job?: { id: string }
        postUrl?: string
        workerCommand?: string
      }>(res)
      if (!res.ok) throw new Error(data.error || 'Import failed')
      if (data.kind === 'import-facebook-post' && data.job && data.workerCommand) {
        onSyncInfo?.({
          kind: 'import-facebook-post',
          job: data.job,
          postUrl: data.postUrl || postUrl.trim(),
          workerCommand: data.workerCommand,
        })
      }
      onQueued?.()
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 max-w-lg">
      <input
        type="url"
        className="input w-full text-xs py-1.5"
        value={postUrl}
        onChange={(e) => setPostUrl(e.target.value)}
        placeholder="https://www.facebook.com/permalink.php?…"
        aria-label={`Facebook post URL for ${sourceName}`}
        disabled={disabled || importing}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className={`text-xs ${t.muted}`}>Price</span>
          <input
            className="input w-full text-xs py-1.5"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="450"
            disabled={disabled || importing}
          />
        </label>
        <label className="space-y-0.5">
          <span className={`text-xs ${t.muted}`}>SKU</span>
          <input
            className="input w-full text-xs py-1.5"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Product SKU"
            disabled={disabled || importing}
          />
        </label>
      </div>
      <label className="space-y-0.5">
        <span className={`text-xs ${t.muted}`}>Category</span>
        <select
          className="input w-full text-xs py-1.5"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={disabled || importing}
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <div>
        <span className={`text-xs ${t.muted}`}>Brand</span>
        <TaxonomyCheckboxList
          options={brands.map((b) => ({ id: b.id, name: b.name, label: b.name }))}
          selected={selectedBrands}
          onChange={setSelectedBrands}
          disabled={disabled || importing}
          preview={brandLabel || '—'}
          searchPlaceholder="Search brand…"
        />
      </div>
      {preview ? (
        <div className={`text-xs rounded-md border px-2 py-1.5 ${t.rowBorder}`}>
          {preview.error ? (
            <p className="text-red-400">{preview.error}</p>
          ) : (
            <>
              {preview.title ? (
                <p className={`font-medium ${t.heading}`}>{preview.title}</p>
              ) : null}
              {preview.descriptionPreview ? (
                <p className={`mt-1 ${t.muted}`}>{preview.descriptionPreview}</p>
              ) : null}
              <p className={`mt-1 ${t.muted}`}>
                {preview.imageCount ?? 0} image(s)
                {preview.detectedPriceHint != null
                  ? ` · detected price hint: ${preview.detectedPriceHint}`
                  : ''}
              </p>
            </>
          )}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={disabled || previewing || importing || !postUrl.trim()}
          onClick={() => void handlePreview()}
        >
          {previewing ? 'Previewing…' : 'Preview post'}
        </button>
        <button
          type="button"
          className="btn-secondary text-xs"
          disabled={disabled || importing || !canImport}
          onClick={() => void handleImport()}
        >
          {importing ? 'Queuing…' : 'Import post'}
        </button>
      </div>
    </div>
  )
}
