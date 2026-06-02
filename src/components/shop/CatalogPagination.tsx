'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAppTheme } from '@/lib/theme-classes'

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
}

export default function CatalogPagination({
  page,
  totalItems,
  pageSize = CATALOG_PAGE_SIZE,
  onPageChange,
  centered = false,
  alignEnd = false,
  compact = false,
}: Props) {
  const t = useAppTheme()
  const textSize = compact ? 'text-xs' : 'text-sm'
  const btnClass = compact ? 'btn-secondary text-xs px-2.5 py-1' : 'btn-secondary text-sm'
  const inputClass = compact ? 'input w-12 text-xs py-1 px-2' : 'input w-20 text-sm'
  const gapClass = compact ? 'gap-1.5' : 'gap-2'
  const blockGap = compact ? 'gap-1.5' : 'gap-3'
  const blockPy = compact ? 'py-1.5' : 'py-3'
  const gotoId = `catalog-goto-${centered ? 'center' : 'side'}${compact ? '-compact' : ''}`
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

  const goToInput = (
    <form
      className={`flex items-center justify-center ${gapClass}`}
      onSubmit={(e) => {
        e.preventDefault()
        if (gotoPage == null) return
        if (gotoPage === safePage) return
        onPageChange(gotoPage)
      }}
    >
      <label className={`${textSize} ${t.muted}`} htmlFor={gotoId}>
        Page
      </label>
      <input
        id={gotoId}
        inputMode="numeric"
        pattern="[0-9]*"
        className={inputClass}
        value={gotoValue}
        onChange={(e) => setGotoValue(e.target.value)}
        aria-label="Go to page number"
      />
      <button type="submit" className={btnClass} disabled={gotoPage == null}>
        Go
      </button>
    </form>
  )

  if (totalItems === 0) return null

  const statusText = (
    <>
      Showing <strong className={t.heading}>{start}</strong>–
      <strong className={t.heading}>{end}</strong> of{' '}
      <strong className={t.heading}>{totalItems}</strong>
      {totalPages > 1 && (
        <>
          {' '}
          · page <strong className={t.heading}>{safePage}</strong> of{' '}
          <strong className={t.heading}>{totalPages}</strong>
        </>
      )}
    </>
  )

  const navButtons = (
    <div className={`flex flex-wrap items-center justify-center ${gapClass}`}>
      <button
        type="button"
        className={btnClass}
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        Previous
      </button>
      <button
        type="button"
        className={btnClass}
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
      >
        Next
      </button>
      {goToInput}
    </div>
  )

  if (centered) {
    return (
      <div className={`flex w-full flex-col items-center ${blockGap} ${blockPy} text-center`}>
        <p className={`${textSize} ${t.muted}`}>{statusText}</p>
        {navButtons}
      </div>
    )
  }

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
