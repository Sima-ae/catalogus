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
import type {
  UnavailableSourceCandidate,
  UnavailableSourceScanResult,
} from '@/lib/scan-unavailable-sources'

type Props = {
  open: boolean
  loading: boolean
  applying: boolean
  error: string
  result: UnavailableSourceScanResult | null
  onClose: () => void
  onRescan: () => void
  onApply: (productIds: string[]) => void
}

function CandidateImage({
  url,
  sourceUrl,
  isDark,
}: {
  url: string | null
  sourceUrl: string
  isDark: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = adminProductImageDisplaySrc(url, sourceUrl)

  useEffect(() => {
    setFailed(false)
  }, [url, sourceUrl])

  if (!src || failed) {
    return (
      <div
        className={`h-12 w-12 shrink-0 rounded ${isDark ? 'bg-dark-700' : 'bg-gray-200'}`}
        aria-hidden
      />
    )
  }

  return (
    <div
      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded ${
        isDark ? 'bg-dark-900' : 'bg-white'
      }`}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="48px"
        className="object-contain p-0.5"
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  )
}

export default function UnavailableSourcesScanModal({
  open,
  loading,
  applying,
  error,
  result,
  onClose,
  onRescan,
  onApply,
}: Props) {
  const { theme } = useTheme()
  const { t: tr } = useI18n()
  const isDark = theme === 'dark'
  const panelRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const candidates = result?.candidates ?? []

  useEffect(() => {
    if (!result) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(result.candidates.map((c) => c.id)))
  }, [result])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading && !applying) {
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
  }, [open, loading, applying, onClose])

  const allSelected = useMemo(
    () => candidates.length > 0 && candidates.every((c) => selected.has(c.id)),
    [candidates, selected]
  )

  const selectedCount = selected.size

  if (!open || typeof document === 'undefined') return null

  const shellClass = isDark
    ? 'border-dark-700 bg-dark-900 text-white'
    : 'border-gray-200 bg-white text-gray-900'

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(candidates.map((c) => c.id)))
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center p-0 sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={tr('admin.products.oosScanClose')}
        disabled={loading || applying}
        onClick={() => {
          if (!loading && !applying) onClose()
        }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="oos-scan-title"
        className={`relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border shadow-xl outline-none sm:rounded-2xl ${shellClass}`}
      >
        <div
          className={`flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <div className="min-w-0">
            <h2 id="oos-scan-title" className="text-base font-semibold sm:text-lg">
              {tr('admin.products.oosScanTitle')}
            </h2>
            <p className={`mt-0.5 text-xs sm:text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {tr('admin.products.oosScanHint')}
            </p>
          </div>
          <button
            type="button"
            className={`rounded-lg p-1.5 ${
              isDark ? 'hover:bg-dark-800' : 'hover:bg-gray-100'
            }`}
            disabled={loading || applying}
            onClick={onClose}
            aria-label={tr('admin.products.oosScanClose')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {loading ? (
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {tr('admin.products.oosScanLoading')}
            </p>
          ) : null}

          {error ? (
            <p className="mb-3 text-sm text-red-500" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && result ? (
            <p className={`mb-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {formatMessage(tr('admin.products.oosScanSummary'), {
                scanned: result.scanned,
                unavailable: result.candidates.length,
                ok: result.ok,
                errors: result.errors,
              })}
            </p>
          ) : null}

          {!loading && result && candidates.length === 0 ? (
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              {tr('admin.products.oosScanEmpty')}
            </p>
          ) : null}

          {!loading && candidates.length > 0 ? (
            <div className="space-y-2">
              <label
                className={`flex items-center gap-2 text-sm font-medium ${
                  isDark ? 'text-gray-200' : 'text-gray-800'
                }`}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={applying}
                  className="rounded border-gray-400"
                />
                {formatMessage(tr('admin.products.oosScanSelectAll'), {
                  count: candidates.length,
                })}
              </label>

              <ul className="divide-y rounded-lg border overflow-hidden" style={{
                borderColor: isDark ? 'rgb(55 65 81)' : 'rgb(229 231 235)',
              }}>
                {candidates.map((item: UnavailableSourceCandidate) => (
                  <li
                    key={item.id}
                    className={`flex items-start gap-3 p-3 ${
                      isDark ? 'border-dark-700' : 'border-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-3 rounded border-gray-400"
                      checked={selected.has(item.id)}
                      disabled={applying}
                      onChange={() => toggleOne(item.id)}
                      aria-label={item.name}
                    />
                    <CandidateImage
                      url={item.image_url}
                      sourceUrl={item.source_url}
                      isDark={isDark}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={appPath(`/admin/products/${item.id}/edit`)}
                        className={`block truncate text-sm font-medium hover:underline ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {item.name}
                      </Link>
                      <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {[item.sku, item.brand, item.reason].filter(Boolean).join(' · ')}
                      </p>
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-0.5 block truncate text-xs hover:underline ${
                          isDark ? 'text-blue-300' : 'text-blue-700'
                        }`}
                      >
                        {item.source_url}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div
          className={`flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3 sm:px-5 ${
            isDark ? 'border-dark-700' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={loading || applying}
            onClick={onRescan}
          >
            {tr('admin.products.oosScanRescan')}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm"
            disabled={loading || applying}
            onClick={onClose}
          >
            {tr('admin.products.oosScanClose')}
          </button>
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={loading || applying || selectedCount === 0}
            onClick={() => onApply(Array.from(selected))}
          >
            {applying
              ? tr('loading.generic')
              : formatMessage(tr('admin.products.oosScanApply'), { count: selectedCount })}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
