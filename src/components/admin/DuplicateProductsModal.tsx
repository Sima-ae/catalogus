'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'
import { formatMessage } from '@/lib/i18n'
import { appPath } from '@/lib/paths'
import { adminProductImageDisplaySrc } from '@/lib/product-image-url'
import type { ImageDuplicateGroup, ImageDuplicateScanResult } from '@/lib/product-image-duplicates'
import type { TitleDuplicateGroup, TitleDuplicateScanResult } from '@/lib/product-title-duplicates'

export type DuplicateScanMode = 'image' | 'title'

type DuplicateScanProduct = {
  id: string
  name: string
  sku: string | null
  status: string
  image_url: string
  source_url: string | null
}

type NormalizedDuplicateGroup = {
  key: string
  matchLabel?: string
  sampleImageUrl?: string
  products: DuplicateScanProduct[]
}

type Props = {
  mode: DuplicateScanMode
  open: boolean
  loading: boolean
  error: string
  result: ImageDuplicateScanResult | TitleDuplicateScanResult | null
  deletingProductIds: Set<string>
  onClose: () => void
  onRescan: () => void
  onDeleteProduct: (productId: string) => void
}

function statusLabel(status: string, tr: (key: string) => string): string {
  if (status === 'active') return tr('adminProducts.status.published')
  if (status === 'draft') return tr('adminProducts.status.draft')
  if (status === 'inactive') return tr('adminProducts.status.inactive')
  if (status === 'trash') return tr('adminProducts.status.trash')
  return status
}

function normalizeGroups(
  mode: DuplicateScanMode,
  result: ImageDuplicateScanResult | TitleDuplicateScanResult | null
): NormalizedDuplicateGroup[] {
  if (!result) return []
  if (mode === 'image') {
    return (result as ImageDuplicateScanResult).groups.map((group: ImageDuplicateGroup) => ({
      key: group.imageKey,
      sampleImageUrl: group.sampleImageUrl,
      products: group.products,
    }))
  }
  return (result as TitleDuplicateScanResult).groups.map((group: TitleDuplicateGroup) => ({
    key: group.titleKey,
    matchLabel: group.matchLabel,
    products: group.products,
  }))
}

function groupSampleSourceUrl(group: NormalizedDuplicateGroup): string | null {
  for (const product of group.products) {
    if (product.source_url) return product.source_url
  }
  return null
}

function DuplicateProductImage({
  url,
  sourceUrl,
  size = 'md',
  isDark,
}: {
  url: string
  sourceUrl?: string | null
  size?: 'sm' | 'md'
  isDark: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = adminProductImageDisplaySrc(url, sourceUrl)

  useEffect(() => {
    setFailed(false)
  }, [url, sourceUrl])

  const boxClass = size === 'sm' ? 'h-10 w-10 rounded' : 'h-24 w-24 rounded-lg'

  if (!src || failed) {
    return (
      <div
        className={`${boxClass} shrink-0 ${isDark ? 'bg-dark-700' : 'bg-gray-200'}`}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden ${boxClass} ${
        isDark ? 'bg-dark-900' : 'bg-white'
      }`}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes={size === 'sm' ? '40px' : '96px'}
        className="object-contain p-0.5"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function copyKey(mode: DuplicateScanMode, kind: 'title' | 'hint' | 'loading' | 'empty' | 'summary' | 'groupLabel' | 'rescan' | 'close' | 'failed'): string {
  if (mode === 'title') {
    const map = {
      title: 'admin.products.duplicateTitleScanTitle',
      hint: 'admin.products.duplicateTitleScanHint',
      loading: 'admin.products.duplicateTitleScanLoading',
      empty: 'admin.products.duplicateTitleScanEmpty',
      summary: 'admin.products.duplicateTitleScanSummary',
      groupLabel: 'admin.products.duplicateTitleScanGroupLabel',
      rescan: 'admin.products.duplicateTitleScanRescan',
      close: 'admin.products.duplicateTitleScanClose',
      failed: 'admin.products.duplicateTitleScanFailed',
    } as const
    return map[kind]
  }
  const map = {
    title: 'admin.products.duplicateScanTitle',
    hint: 'admin.products.duplicateScanHint',
    loading: 'admin.products.duplicateScanLoading',
    empty: 'admin.products.duplicateScanEmpty',
    summary: 'admin.products.duplicateScanSummary',
    groupLabel: 'admin.products.duplicateScanGroupLabel',
    rescan: 'admin.products.duplicateScanRescan',
    close: 'admin.products.duplicateScanClose',
    failed: 'admin.products.duplicateScanFailed',
  } as const
  return map[kind]
}

export default function DuplicateProductsModal({
  mode,
  open,
  loading,
  error,
  result,
  deletingProductIds,
  onClose,
  onRescan,
  onDeleteProduct,
}: Props) {
  const { theme } = useTheme()
  const { t: tr } = useI18n()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => normalizeGroups(mode, result), [mode, result])

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
              {tr(copyKey(mode, 'title'))}
            </h2>
            {result && !loading ? (
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {formatMessage(tr(copyKey(mode, 'summary')), {
                  groups: result.groups.length,
                  products: result.duplicateProductIds.length,
                  scanned: result.scannedProducts,
                })}
              </p>
            ) : (
              <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {tr(copyKey(mode, 'hint'))}
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
              {tr(copyKey(mode, 'loading'))}
            </p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : groups.length === 0 ? (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              {tr(copyKey(mode, 'empty'))}
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <DuplicateGroupCard
                  key={group.key}
                  mode={mode}
                  group={group}
                  isDark={isDark}
                  tr={tr}
                  deletingProductIds={deletingProductIds}
                  onDeleteProduct={onDeleteProduct}
                />
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
            disabled={loading || deletingProductIds.size > 0}
            onClick={onRescan}
          >
            {tr(copyKey(mode, 'rescan'))}
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading || deletingProductIds.size > 0}
            onClick={onClose}
          >
            {tr(copyKey(mode, 'close'))}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function DuplicateGroupCard({
  mode,
  group,
  isDark,
  tr,
  deletingProductIds,
  onDeleteProduct,
}: {
  mode: DuplicateScanMode
  group: NormalizedDuplicateGroup
  isDark: boolean
  tr: (key: string) => string
  deletingProductIds: Set<string>
  onDeleteProduct: (productId: string) => void
}) {
  const sampleSourceUrl = groupSampleSourceUrl(group)

  return (
    <article
      className={`rounded-lg border p-3 sm:p-4 ${
        isDark ? 'border-dark-700 bg-dark-800/50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {mode === 'image' && group.sampleImageUrl ? (
          <DuplicateProductImage
            url={group.sampleImageUrl}
            sourceUrl={sampleSourceUrl}
            size="md"
            isDark={isDark}
          />
        ) : (
          <div
            className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border px-2 text-center text-[11px] font-semibold leading-snug ${
              isDark ? 'border-dark-600 bg-dark-900 text-primary-400' : 'border-gray-200 bg-white text-primary-700'
            }`}
          >
            {group.matchLabel}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {mode === 'title' && group.matchLabel
              ? formatMessage(tr('admin.products.duplicateTitleScanGroupLabel'), {
                  count: group.products.length,
                  keywords: group.matchLabel,
                })
              : formatMessage(tr('admin.products.duplicateScanGroupLabel'), {
                  count: group.products.length,
                })}
          </p>
          <ul className="mt-2 space-y-2">
            {group.products.map((product) => {
              const deleting = deletingProductIds.has(product.id)
              return (
                <li
                  key={product.id}
                  className={`flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
                    isDark ? 'border-dark-600 bg-dark-900' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <DuplicateProductImage
                      url={product.image_url}
                      sourceUrl={product.source_url}
                      size="sm"
                      isDark={isDark}
                    />
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        {product.sku ? `SKU: ${product.sku}` : `${tr('adminProducts.col.sku')}: —`}
                        {' · '}
                        {statusLabel(product.status, tr)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                    <Link
                      href={appPath(`/admin/products/${product.id}/edit`)}
                      className="btn-secondary text-xs"
                    >
                      {tr('adminProducts.edit')}
                    </Link>
                    <button
                      type="button"
                      className="text-xs px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                      disabled={deleting}
                      onClick={() => onDeleteProduct(product.id)}
                    >
                      {deleting ? tr('product.trash.busy') : tr('adminProducts.delete')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </article>
  )
}
