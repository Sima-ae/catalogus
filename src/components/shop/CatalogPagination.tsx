'use client'

import type { ReactNode } from 'react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useAppTheme } from '@/lib/theme-classes'
import { useI18n } from '@/lib/i18n-context'

export const CATALOG_PAGE_SIZE = 60

type Props = {
  page: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
  centered?: boolean
  /** When true, align pagination controls to the right (status stays on the left). */
  alignEnd?: boolean
  /** Smaller text, buttons, and spacing (e.g. pricelist table). */
  compact?: boolean
  /** Extra controls after the Go button (same row, centered with nav). */
  trailing?: ReactNode
}

export default function CatalogPagination({
  page,
  totalItems,
  pageSize = CATALOG_PAGE_SIZE,
  onPageChange,
  centered = false,
  alignEnd = false,
  compact = false,
  trailing,
}: Props) {
  const t = useAppTheme()
  const { t: tr } = useI18n()
  const textSize = compact ? 'text-[11px] leading-tight' : 'text-sm'
  const btnClass = compact
    ? 'btn-secondary text-[11px] leading-tight px-1.5 py-0.5'
    : 'btn-secondary text-sm'
  const inputClass = compact ? 'input w-9 text-[11px] py-0.5 px-1' : 'input w-20 text-sm'
  const gapClass = compact ? 'gap-1' : 'gap-2'
  const blockGap = compact ? 'gap-1.5' : 'gap-3'
  const blockPy = compact ? 'py-1' : 'py-3'
  const gotoId = useId().replace(/:/g, '')
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1
  const end = Math.min(safePage * pageSize, totalItems)
  const [gotoValue, setGotoValue] = useState('')

  useEffect(() => {
    setGotoValue(String(safePage))
  }, [safePage])

  const gotoPage = useMemo(() => {
    const parsed = parseInt(gotoValue.trim(), 10)
    if (!Number.isFinite(parsed)) return null
    return Math.min(totalPages, Math.max(1, parsed))
  }, [gotoValue, totalPages])

  const goToInput = (hideLabel?: boolean) => (
    <form
      className={`flex items-center justify-center ${gapClass}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (gotoPage == null) return
        if (gotoPage === safePage) return
        onPageChange(gotoPage)
      }}
    >
      {hideLabel ? null : (
        <label className={`${textSize} ${t.muted}`} htmlFor={gotoId}>
          {tr('pagination.pageLabel')}
        </label>
      )}
      <input
        id={gotoId}
        inputMode="numeric"
        pattern="[0-9]*"
        className={inputClass}
        value={gotoValue}
        onChange={(e) => setGotoValue(e.target.value)}
        aria-label={tr('pagination.pageLabel')}
      />
      <button type="submit" className={btnClass} disabled={gotoPage == null}>
        {tr('pagination.go')}
      </button>
    </form>
  )

  if (totalItems === 0) return null

  const pagePart =
    totalPages > 1 ? tr('pagination.pagePart', { page: safePage, totalPages }) : ''

  const statusText = tr('pagination.showing', {
    start,
    end,
    total: totalItems,
    pagePart,
  })

  const statusTextCompact = tr('pagination.showing', {
    start,
    end,
    total: totalItems,
    pagePart: '',
  })

  const prevLabel = compact ? tr('pagination.previousShort') : tr('pagination.previous')
  const nextLabel = compact ? tr('pagination.nextShort') : tr('pagination.next')

  const pageNav = (opts?: { nowrap?: boolean; hidePageLabel?: boolean }) => (
    <div
      className={`flex items-center justify-center ${gapClass} ${
        opts?.nowrap ? 'flex-nowrap shrink-0' : 'flex-wrap'
      }`}
    >
      <button
        type="button"
        className={btnClass}
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        aria-label={tr('pagination.previous')}
      >
        {prevLabel}
      </button>
      <button
        type="button"
        className={btnClass}
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
        aria-label={tr('pagination.next')}
      >
        {nextLabel}
      </button>
      {goToInput(opts?.hidePageLabel)}
    </div>
  )

  if (centered && trailing) {
    return (
      <div
        className={`flex w-full min-w-0 items-center ${compact ? 'gap-1.5' : 'gap-3'} ${blockPy}`}
      >
        <p className={`${textSize} ${t.muted} min-w-0 shrink truncate whitespace-nowrap`}>
          {compact ? statusTextCompact : statusText}
        </p>
        <div
          className={`ml-auto flex min-w-0 flex-nowrap items-center overflow-x-auto ${gapClass}`}
        >
          {pageNav({ nowrap: true, hidePageLabel: compact })}
          {trailing}
        </div>
      </div>
    )
  }

  if (centered) {
    return (
      <div className={`flex w-full flex-col items-center ${blockGap} ${blockPy} text-center`}>
        <p className={`${textSize} ${t.muted}`}>{statusText}</p>
        {pageNav()}
      </div>
    )
  }

  const navButtons = trailing ? (
    <div className={`flex flex-wrap items-center justify-center ${gapClass}`}>
      {pageNav()}
      <div className={compact ? 'ml-6 sm:ml-10' : 'ml-8 sm:ml-10'}>{trailing}</div>
    </div>
  ) : (
    pageNav()
  )

  return (
    <div
      className={`flex flex-col ${blockGap} ${blockPy} sm:flex-row sm:items-center ${
        alignEnd ? 'sm:justify-end' : 'sm:justify-between'
      } ${t.isDark ? 'border-dark-800' : 'border-gray-200'}`}
    >
      <p className={`${textSize} ${t.muted} ${alignEnd ? 'sm:mr-auto' : ''}`}>{statusText}</p>
      {navButtons}
    </div>
  )
}

export const catalogGridClassName =
  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5'
