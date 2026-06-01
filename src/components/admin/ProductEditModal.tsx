'use client'

import { useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import type { Product } from '@/lib/types'
import { useTheme } from '@/lib/theme'
import ProductForm from '@/components/admin/ProductForm'

type ProductEditModalProps = {
  productId: string
  open: boolean
  onClose: () => void
  onSaved?: (product: Product) => void
}

export default function ProductEditModal({
  productId,
  open,
  onClose,
  onSaved,
}: ProductEditModalProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close edit product dialog"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-edit-modal-title"
        tabIndex={-1}
        className={`relative z-10 flex w-full max-w-4xl flex-col sm:max-h-[92vh] sm:rounded-xl border shadow-2xl outline-none ${
          isDark ? 'border-dark-700 bg-dark-900' : 'border-gray-200 bg-white'
        } max-h-[100dvh] rounded-t-xl`}
      >
        <div
          className={`sticky top-0 z-10 flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 ${
            isDark ? 'border-dark-700 bg-dark-900/95' : 'border-gray-200 bg-white/95'
          }`}
        >
          <div className="min-w-0">
            <h2
              id="product-edit-modal-title"
              className={`text-lg font-semibold truncate ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
            >
              Edit product
            </h2>
            <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Update all product details, category, images, and variants.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`shrink-0 rounded-lg p-2 transition-colors ${
              isDark
                ? 'text-gray-400 hover:bg-dark-800 hover:text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          <ProductForm
            mode="edit"
            productId={productId}
            portal="admin"
            variant="modal"
            onCancel={onClose}
            onSaved={(product) => {
              onSaved?.(product)
            }}
          />
        </div>
      </div>
    </div>
  )
}
