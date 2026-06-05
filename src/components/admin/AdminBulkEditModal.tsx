'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import type { CategoryPickerOption } from '@/lib/category-picker'
import type { Product } from '@/lib/types'

type BrandOption = { id: string; name: string }

export type BulkEditPayload = {
  category?: string
  brand?: string | null
  price?: number
  original_price?: number | null
  status?: string
}

type Props = {
  open: boolean
  selectedProducts: Product[]
  categories: CategoryPickerOption[]
  brands: BrandOption[]
  busy?: boolean
  onClose: () => void
  onApply: (patch: BulkEditPayload) => void | Promise<void>
}

function countByField(products: Product[], field: 'category' | 'brand'): Map<string, number> {
  const counts = new Map<string, number>()
  for (const p of products) {
    const key = String(p[field] ?? '').trim() || '—'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

function namesFromCounts(counts: Map<string, number>): Set<string> {
  const names = new Set<string>()
  for (const name of Array.from(counts.keys())) {
    if (name !== '—') names.add(name)
  }
  return names
}

function orderedNames(selected: Set<string>, order: string[]): string[] {
  const out: string[] = []
  for (const name of order) {
    if (selected.has(name) && !out.includes(name)) out.push(name)
  }
  for (const name of Array.from(selected)) {
    if (!out.includes(name)) out.push(name)
  }
  return out
}

function CurrentValues({
  label,
  counts,
  isDark,
}: {
  label: string
  counts: Map<string, number>
  isDark: boolean
}) {
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  return (
    <div className="space-y-1.5">
      <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
        Current {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([name, n]) => (
          <span
            key={name}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              isDark
                ? 'bg-dark-800 border-dark-600 text-gray-200'
                : 'bg-gray-100 border-gray-200 text-gray-800'
            }`}
          >
            {name}
            <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>({n})</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function AdminBulkEditModal({
  open,
  selectedProducts,
  categories,
  brands,
  busy = false,
  onClose,
  onApply,
}: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)
  const count = selectedProducts.length

  const categoryCounts = useMemo(() => countByField(selectedProducts, 'category'), [selectedProducts])
  const brandCounts = useMemo(() => countByField(selectedProducts, 'brand'), [selectedProducts])

  const currentCategoryNames = useMemo(() => namesFromCounts(categoryCounts), [categoryCounts])
  const currentBrandNames = useMemo(() => namesFromCounts(brandCounts), [brandCounts])

  const categoryOrder = useMemo(() => categories.map((c) => c.name), [categories])
  const brandOrder = useMemo(() => brands.map((b) => b.name), [brands])

  const checkboxClass =
    'h-4 w-4 rounded border-gray-400 accent-primary-600 text-primary-600 focus:ring-primary-500'

  const [extraCategories, setExtraCategories] = useState<Set<string>>(new Set())
  const [extraBrands, setExtraBrands] = useState<Set<string>>(new Set())
  const [clearBrand, setClearBrand] = useState(false)
  const [changePrice, setChangePrice] = useState(false)
  const [price, setPrice] = useState('')
  const [changeOriginalPrice, setChangeOriginalPrice] = useState(false)
  const [originalPrice, setOriginalPrice] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!open) return
    setExtraCategories(new Set())
    setExtraBrands(new Set())
    setClearBrand(false)
    setChangePrice(false)
    setPrice('')
    setChangeOriginalPrice(false)
    setOriginalPrice('')
    setStatus('')
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)
    requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, busy, onClose])

  if (!open) return null

  const isCategoryChecked = (name: string) =>
    currentCategoryNames.has(name) || extraCategories.has(name)

  const isBrandChecked = (name: string) =>
    !clearBrand && (currentBrandNames.has(name) || extraBrands.has(name))

  const toggleCategory = (name: string) => {
    if (currentCategoryNames.has(name)) return
    setExtraCategories((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleBrand = (name: string) => {
    if (currentBrandNames.has(name)) return
    setClearBrand(false)
    setExtraBrands((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleClearBrand = () => {
    setClearBrand((prev) => {
      const next = !prev
      if (next) setExtraBrands(new Set())
      return next
    })
  }

  const buildCategoryValue = (): string | undefined => {
    if (extraCategories.size === 0) return undefined
    const all = new Set([
      ...Array.from(currentCategoryNames),
      ...Array.from(extraCategories),
    ])
    return orderedNames(all, categoryOrder).join(' / ')
  }

  const buildBrandValue = (): string | undefined => {
    if (extraBrands.size === 0) return undefined
    const all = new Set([
      ...Array.from(currentBrandNames),
      ...Array.from(extraBrands),
    ])
    return orderedNames(all, brandOrder).join(' X ')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const patch: BulkEditPayload = {}

    const categoryValue = buildCategoryValue()
    if (categoryValue) patch.category = categoryValue

    if (clearBrand) patch.brand = null
    else {
      const brandValue = buildBrandValue()
      if (brandValue) patch.brand = brandValue
    }

    if (changePrice) {
      const n = Number(price)
      if (!Number.isFinite(n) || n < 0) return
      patch.price = n
    }

    if (changeOriginalPrice) {
      const trimmed = originalPrice.trim()
      if (trimmed === '') patch.original_price = null
      else {
        const n = Number(trimmed)
        if (!Number.isFinite(n) || n < 0) return
        patch.original_price = n
      }
    }

    if (status) patch.status = status

    if (!Object.keys(patch).length) return
    void onApply(patch)
  }

  const hasChanges =
    extraCategories.size > 0 ||
    extraBrands.size > 0 ||
    clearBrand ||
    changePrice ||
    changeOriginalPrice ||
    status !== ''

  const muted = isDark ? 'text-gray-400' : 'text-gray-600'
  const label = isDark ? 'text-gray-300' : 'text-gray-700'

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close bulk edit"
        disabled={busy}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-edit-title"
        tabIndex={-1}
        className={`relative z-10 w-full max-w-lg flex flex-col sm:max-h-[92vh] sm:rounded-xl border shadow-2xl outline-none ${
          isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
        } max-h-[100dvh] rounded-t-xl`}
      >
        <div
          className={`flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <div>
            <h2
              id="bulk-edit-title"
              className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
            >
              Bulk edit
            </h2>
            <p className={`text-sm mt-0.5 ${muted}`}>
              {count} selected — current categories/brands stay checked. Add more to combine
              (brands: Supreme X Nike).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`rounded-lg p-2 ${isDark ? 'hover:bg-dark-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'}`}
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-4 py-4 sm:px-6 space-y-5">
            <CurrentValues label="categories" counts={categoryCounts} isDark={isDark} />
            <CurrentValues label="brands" counts={brandCounts} isDark={isDark} />

            <fieldset className="space-y-2">
              <legend className={`text-sm font-medium ${label}`}>Set category</legend>
              <p className={`text-xs ${muted}`}>
                Current categories stay checked. Add more to combine (e.g. SHOES / BAGS).
              </p>
              <div
                className={`max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1 ${
                  isDark ? 'border-dark-600 bg-dark-800/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {categories.map((c) => {
                  const isCurrent = currentCategoryNames.has(c.name)
                  const isActiveCurrent =
                    isCurrent && categoryCounts.get(c.name) === count
                  const checked = isCategoryChecked(c.name)
                  const locked = isCurrent
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        locked ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        checked
                          ? isDark
                            ? 'bg-primary-500/20'
                            : 'bg-primary-50'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCategory(c.name)}
                        disabled={busy || locked}
                        className={checkboxClass}
                      />
                      <span className={`text-sm flex-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        {c.label}
                      </span>
                      {isActiveCurrent ? (
                        <span className={`text-xs ${muted}`}>current</span>
                      ) : isCurrent ? (
                        <span className={`text-xs ${muted}`}>{categoryCounts.get(c.name)}</span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-2">
              <legend className={`text-sm font-medium ${label}`}>Set brand</legend>
              <p className={`text-xs ${muted}`}>
                Current brands stay checked. Add collabs with X (e.g. Supreme X Nike).
              </p>
              <div
                className={`max-h-40 overflow-y-auto rounded-lg border p-2 space-y-1 ${
                  isDark ? 'border-dark-600 bg-dark-800/50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <label
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer ${
                    clearBrand
                      ? isDark
                        ? 'bg-primary-500/20'
                        : 'bg-primary-50'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={clearBrand}
                    onChange={toggleClearBrand}
                    disabled={busy}
                    className={checkboxClass}
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    Clear brand
                  </span>
                </label>
                {brands.map((b) => {
                  const isCurrent = currentBrandNames.has(b.name)
                  const isActiveCurrent =
                    isCurrent && brandCounts.get(b.name) === count
                  const checked = isBrandChecked(b.name)
                  const locked = isCurrent
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                        locked ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        checked
                          ? isDark
                            ? 'bg-primary-500/20'
                            : 'bg-primary-50'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrand(b.name)}
                        disabled={busy || locked || clearBrand}
                        className={checkboxClass}
                      />
                      <span className={`text-sm flex-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                        {b.name}
                      </span>
                      {isActiveCurrent ? (
                        <span className={`text-xs ${muted}`}>current</span>
                      ) : isCurrent ? (
                        <span className={`text-xs ${muted}`}>{brandCounts.get(b.name)}</span>
                      ) : null}
                    </label>
                  )
                })}
              </div>
              {extraBrands.size > 0 ? (
                <p className={`text-xs ${muted}`}>
                  Will set brand to:{' '}
                  <strong className={isDark ? 'text-gray-200' : 'text-gray-800'}>
                    {orderedNames(
                      new Set([
                        ...Array.from(currentBrandNames),
                        ...Array.from(extraBrands),
                      ]),
                      brandOrder
                    ).join(' X ')}
                  </strong>
                </p>
              ) : null}
            </fieldset>

            {extraCategories.size > 0 ? (
              <p className={`text-xs ${muted}`}>
                Will set category to:{' '}
                <strong className={isDark ? 'text-gray-200' : 'text-gray-800'}>
                  {orderedNames(
                    new Set([
                      ...Array.from(currentCategoryNames),
                      ...Array.from(extraCategories),
                    ]),
                    categoryOrder
                  ).join(' / ')}
                </strong>
              </p>
            ) : null}

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={changePrice}
                  onChange={(e) => setChangePrice(e.target.checked)}
                  disabled={busy}
                  className={checkboxClass}
                />
                <span className={`text-sm font-medium ${label}`}>Set price</span>
              </label>
              {changePrice ? (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input w-full"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={busy}
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={changeOriginalPrice}
                  onChange={(e) => setChangeOriginalPrice(e.target.checked)}
                  disabled={busy}
                  className={checkboxClass}
                />
                <span className={`text-sm font-medium ${label}`}>Set original price</span>
              </label>
              {changeOriginalPrice ? (
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="input w-full"
                  placeholder="Leave empty to clear"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  disabled={busy}
                />
              ) : null}
            </div>

            <label className="block space-y-1">
              <span className={`text-sm font-medium ${label}`}>Status</span>
              <select
                className="input w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={busy}
              >
                <option value="">— Keep unchanged —</option>
                <option value="active">Published</option>
                <option value="draft">Draft</option>
                <option value="inactive">Inactive</option>
                <option value="trash">Trash</option>
              </select>
            </label>
          </div>

          <div
            className={`flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 sm:px-6 ${
              isDark ? 'border-dark-700' : 'border-gray-200'
            }`}
          >
            <button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !hasChanges}>
              {busy ? 'Saving…' : `Apply to ${count} product${count === 1 ? '' : 's'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
