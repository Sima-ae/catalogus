'use client'

import { useEffect, useRef, useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import type { CategoryPickerOption } from '@/lib/category-picker'

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
  count: number
  categories: CategoryPickerOption[]
  brands: BrandOption[]
  busy?: boolean
  onClose: () => void
  onApply: (patch: BulkEditPayload) => void | Promise<void>
}

const UNCHANGED = ''

export default function AdminBulkEditModal({
  open,
  count,
  categories,
  brands,
  busy = false,
  onClose,
  onApply,
}: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)

  const [category, setCategory] = useState(UNCHANGED)
  const [brand, setBrand] = useState(UNCHANGED)
  const [changePrice, setChangePrice] = useState(false)
  const [price, setPrice] = useState('')
  const [changeOriginalPrice, setChangeOriginalPrice] = useState(false)
  const [originalPrice, setOriginalPrice] = useState('')
  const [status, setStatus] = useState(UNCHANGED)

  useEffect(() => {
    if (!open) return
    setCategory(UNCHANGED)
    setBrand(UNCHANGED)
    setChangePrice(false)
    setPrice('')
    setChangeOriginalPrice(false)
    setOriginalPrice('')
    setStatus(UNCHANGED)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const patch: BulkEditPayload = {}

    if (category !== UNCHANGED) patch.category = category
    if (brand === '__clear__') patch.brand = null
    else if (brand !== UNCHANGED) patch.brand = brand

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

    if (status !== UNCHANGED) patch.status = status

    if (!Object.keys(patch).length) return
    void onApply(patch)
  }

  const hasChanges =
    category !== UNCHANGED ||
    brand !== UNCHANGED ||
    changePrice ||
    changeOriginalPrice ||
    status !== UNCHANGED

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
            <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Update {count} selected product{count === 1 ? '' : 's'}. Leave a field unchanged to
              keep the current value.
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
          <div className="overflow-y-auto px-4 py-4 sm:px-6 space-y-4">
            <label className="block space-y-1">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Category
              </span>
              <select
                className="input w-full"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={busy}
              >
                <option value={UNCHANGED}>— Keep unchanged —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Brand
              </span>
              <select
                className="input w-full"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                disabled={busy}
              >
                <option value={UNCHANGED}>— Keep unchanged —</option>
                <option value="__clear__">— Clear brand —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={changePrice}
                  onChange={(e) => setChangePrice(e.target.checked)}
                  disabled={busy}
                  className="rounded border-gray-400"
                />
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Set price
                </span>
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
                  className="rounded border-gray-400"
                />
                <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Set original price
                </span>
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
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Status
              </span>
              <select
                className="input w-full"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={busy}
              >
                <option value={UNCHANGED}>— Keep unchanged —</option>
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
            <button
              type="submit"
              className="btn-primary"
              disabled={busy || !hasChanges}
            >
              {busy ? 'Saving…' : `Apply to ${count} product${count === 1 ? '' : 's'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
