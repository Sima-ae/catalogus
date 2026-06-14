'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
import { appPath } from '@/lib/paths'
import { productImageSrc, shouldUnoptimizeProductImage } from '@/lib/product-image-url'
import type { ImageDuplicateGroup, ImageDuplicateScanResult } from '@/lib/product-image-duplicates'

type Props = {
  open: boolean
  loading: boolean
  error: string
  result: ImageDuplicateScanResult | null
  onClose: () => void
  onRescan: () => void
}

function statusLabel(status: string, tr: (key: string) => string): string {
  if (status === 'active') return tr('adminProducts.status.published')
  if (status === 'draft') return tr('adminProducts.status.draft')
  if (status === 'inactive') return tr('adminProducts.status.inactive')
  if (status === 'trash') return tr('adminProducts.status.trash')
  return status
}

export default function DuplicateProductsModal({
  open,
  loading,
  error,
  result,
  onClose,
  onRescan,
}: Props) {
  const { theme } = useTheme()
  const { t: tr } = useI18n()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
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
  }, [open, loading, onClose])

  if (!open || typeof document === 'undefined') return null

  const shellClass = isDark
    ? 'border-dark-700 bg-dark-900 text-white'
    : 'border-gray-200 bg-white text-gray-900'

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center p-3 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label={tr('admin.closeOverlay')}
        disabled={loading}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="duplicate-products-title"
        tabIndex={-1}
        className={`relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-2xl outline-none ${shellClass}`}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 sm:px-6 sm:py-4 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <div className="min-w-0">
            <h2 id="duplicate-products-title" className="text-base font-semibold sm:text-lg">
              {tr('admin.products.duplicateScanTitle')}
            </h2>
            {result && !loading ? (
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatMessage(tr('admin.products.duplicateScanSummary'), {
                  groups: result.groups.length,
                  products: result.duplicateProductIds.length,
                  scanned: result.scannedProducts,
                })}
              </p>
            ) : (
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {tr('admin.products.duplicateScanHint')}
              </p>
            )}
          </div>
          <button
            type="button"
            className={`rounded-lg p-2 ${isDark ? 'hover:bg-dark-800' : 'hover:bg-gray-100'}`}
            aria-label={tr('admin.closeOverlay')}
            disabled={loading}
            onClick={onClose}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          {loading ? (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {tr('admin.products.duplicateScanLoading')}
            </p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : !result || result.groups.length === 0 ? (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {tr('admin.products.duplicateScanEmpty')}
            </p>
          ) : (
            <div className="space-y-4">
              {result.groups.map((group) => (
                <DuplicateGroupCard key={group.imageKey} group={group} isDark={isDark} tr={tr} />
              ))}
            </div>
          )}
        </div>

        <div
          className={`flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-4 py-3 sm:px-6 sm:py-4 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={loading}
            onClick={onRescan}
          >
            {tr('admin.products.duplicateScanRescan')}
          </button>
          <button type="button" className="btn-primary text-sm" disabled={loading} onClick={onClose}>
            {tr('admin.products.duplicateScanClose')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function DuplicateGroupCard({
  group,
  isDark,
  tr,
}: {
  group: ImageDuplicateGroup
  isDark: boolean
  tr: (key: string) => string
}) {
  const imageSrc = productImageSrc(group.sampleImageUrl)

  return (
    <article
      className={`rounded-lg border p-3 sm:p-4 ${
        isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className={`relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-lg sm:mx-0 ${
            isDark ? 'bg-dark-900' : 'bg-white'
          }`}
        >
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt=""
              fill
              sizes="96px"
              className="object-contain p-1"
              unoptimized={shouldUnoptimizeProductImage(imageSrc)}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {formatMessage(tr('admin.products.duplicateScanGroupLabel'), {
              count: group.products.length,
            })}
          </p>
          <ul className="mt-2 space-y-2">
            {group.products.map((product) => (
              <li
                key={product.id}
                className={`flex flex-col gap-1 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
                  isDark ? 'border-dark-600 bg-dark-900' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {product.sku ? `SKU: ${product.sku}` : tr('adminProducts.col.sku') + ': —'}
                    {' · '}
                    {statusLabel(product.status, tr)}
                  </p>
                </div>
                <Link
                  href={appPath(`/admin/products/${product.id}/edit`)}
                  className="btn-secondary shrink-0 text-xs"
                >
                  {tr('adminProducts.edit')}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  )
}
