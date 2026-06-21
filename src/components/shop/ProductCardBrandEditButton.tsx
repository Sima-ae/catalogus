'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/lib/auth-local'
import { adminAuthHeaders } from '@/lib/admin-fetch'
import { appPath } from '@/lib/paths'
import { parseJsonResponse } from '@/lib/fetch-json'
import { useI18n } from '@/lib/i18n-context'
import { useTheme } from '@/lib/theme'
import TaxonomyCheckboxList from '@/components/admin/TaxonomyCheckboxList'
import {
  brandNamesFromCompound,
  joinBrandNames,
  parseBrandCompound,
} from '@/lib/product-taxonomy'
import type { Product } from '@/lib/types'

type BrandOption = { id: string; name: string }

export type ProductQuickEditSaved = {
  productId: string
  name: string
  brand: string | null
}

type Props = {
  productId: string
  productName?: string
  currentBrand?: string | null
  size?: 'sm' | 'md'
  className?: string
  onSaved?: (saved: ProductQuickEditSaved) => void
}

let brandsCache: BrandOption[] | null = null
let brandsPromise: Promise<BrandOption[]> | null = null

async function loadBrandOptions(): Promise<BrandOption[]> {
  if (brandsCache) return brandsCache
  if (brandsPromise) return brandsPromise
  brandsPromise = fetch(appPath('/api/brands'))
    .then(async (res) => {
      if (!res.ok) throw new Error('Failed to load brands')
      const data = (await res.json()) as unknown
      if (!Array.isArray(data)) return []
      return data
        .map((row) => ({
          id: String((row as BrandOption).id ?? ''),
          name: String((row as BrandOption).name ?? '').trim(),
        }))
        .filter((row) => row.id && row.name)
    })
    .then((rows) => {
      brandsCache = rows
      return rows
    })
    .finally(() => {
      brandsPromise = null
    })
  return brandsPromise
}

export default function ProductCardBrandEditButton({
  productId,
  productName,
  currentBrand,
  size = 'sm',
  className = '',
  onSaved,
}: Props) {
  const { t } = useI18n()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [titleName, setTitleName] = useState('')
  const [brands, setBrands] = useState<BrandOption[]>(brandsCache ?? [])
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)

  const brandOrder = useMemo(() => brands.map((b) => b.name), [brands])
  const brandPreview =
    selectedBrands.size > 0
      ? joinBrandNames(selectedBrands, brandOrder)
      : t('productForm.noBrand')

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!justOpened) return

    setError('')
    setTitleName(String(productName ?? '').trim())

    let cancelled = false

    const applySelection = (rows: BrandOption[]) => {
      const names = brandNamesFromCompound(String(currentBrand ?? ''), rows)
      setSelectedBrands(
        new Set(names.length ? names : parseBrandCompound(String(currentBrand ?? '')))
      )
    }

    if (brandsCache) {
      setBrands(brandsCache)
      applySelection(brandsCache)
      return
    }

    setLoadingBrands(true)
    void loadBrandOptions()
      .then((rows) => {
        if (cancelled) return
        setBrands(rows)
        applySelection(rows)
      })
      .catch(() => {
        if (!cancelled) setError(t('productForm.errorNetwork'))
      })
      .finally(() => {
        if (!cancelled) setLoadingBrands(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, currentBrand, productName, t])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!busy) setOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown, true)
    requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open, busy])

  if (authLoading || !user || !isAdmin) return null

  const iconClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError('')
    setOpen(true)
  }

  const handleSave = async () => {
    const trimmedName = titleName.trim()
    if (!trimmedName) {
      setError(t('productCard.nameRequired'))
      return
    }

    setBusy(true)
    setError('')
    try {
      const brand = selectedBrands.size > 0 ? joinBrandNames(selectedBrands, brandOrder) : null
      const res = await fetch(appPath(`/api/products/${productId}`), {
        method: 'PATCH',
        cache: 'no-store',
        headers: {
          ...adminAuthHeaders(user),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: trimmedName, brand }),
      })
      const data = await parseJsonResponse<Product & { error?: string }>(res)
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string' && data.error.trim()
            ? data.error
            : t('productForm.errorSaveFailed')
        )
      }
      const savedName = String(data.name ?? trimmedName).trim()
      const savedBrand =
        data.brand !== undefined && data.brand !== null
          ? String(data.brand).trim() || null
          : brand
      setOpen(false)
      onSaved?.({ productId, name: savedName, brand: savedBrand })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('productForm.errorSaveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const label = productName?.trim() || t('product.trash.defaultName')
  const titleId = `product-card-brand-edit-title-${productId}`

  const modal =
    open && typeof document !== 'undefined' ? (
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
        role="presentation"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
          aria-label={t('productForm.close')}
          disabled={busy}
          onClick={() => {
            if (busy) return
            setOpen(false)
          }}
        />

        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className={`relative z-10 flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col rounded-2xl border shadow-2xl outline-none ${
            isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 ${
              isDark ? 'border-dark-700' : 'border-gray-200'
            }`}
          >
            <div className="min-w-0">
              <h2
                id={titleId}
                className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                {t('productCard.quickEdit')}
              </h2>
              <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (busy) return
                setOpen(false)
              }}
              className={`shrink-0 rounded-lg p-1.5 ${
                isDark
                  ? 'text-gray-400 hover:bg-dark-800 hover:text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-label={t('productForm.close')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor={`product-card-title-${productId}`}
                className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
              >
                {t('productForm.name')}
              </label>
              <input
                id={`product-card-title-${productId}`}
                type="text"
                value={titleName}
                onChange={(e) => setTitleName(e.target.value)}
                disabled={busy}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? 'border-dark-600 bg-dark-800 text-white placeholder:text-gray-500'
                    : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                }`}
              />
            </div>

            <div className="space-y-1.5">
            <p className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
              {t('productForm.brand')}
            </p>
            {loadingBrands ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('loading.generic')}
              </p>
            ) : (
              <TaxonomyCheckboxList
                options={brands.map((b) => ({
                  id: b.id,
                  name: b.name,
                  label: b.name,
                }))}
                selected={selectedBrands}
                onChange={setSelectedBrands}
                disabled={busy}
                searchPlaceholder={t('productForm.searchBrand')}
                noMatchesMessage={t('productForm.searchNoMatches')}
                preview={brandPreview}
                emptyPreview={t('productForm.noBrand')}
              />
            )}
            </div>
            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </div>

          <div
            className={`flex shrink-0 justify-end gap-2 border-t px-4 py-3 ${
              isDark ? 'border-dark-700' : 'border-gray-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                if (busy) return
                setOpen(false)
              }}
              disabled={busy}
              className="btn-secondary px-4 py-2 text-sm"
            >
              {t('productForm.cancel')}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={busy || loadingBrands}
              className="btn-primary px-4 py-2 text-sm"
            >
              {busy ? t('productForm.saving') : t('productForm.saveChanges')}
            </button>
          </div>
        </div>
      </div>
    ) : null

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={`rounded-full p-1.5 bg-black/50 hover:bg-primary-600/90 text-white transition-colors disabled:opacity-50 ${className}`}
        aria-label={t('productCard.quickEdit')}
        title={t('productCard.quickEdit')}
      >
        <PencilSquareIcon className={iconClass} />
      </button>

      {modal ? createPortal(modal, document.body) : null}
    </>
  )
}
