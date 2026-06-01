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
}

export default function CatalogPagination({
  page,
  totalItems,
  pageSize = CATALOG_PAGE_SIZE,
  onPageChange,
  centered = false,
}: Props) {
  const t = useAppTheme()
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
      className="flex items-center justify-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (gotoPage == null) return
        if (gotoPage === safePage) return
        onPageChange(gotoPage)
      }}
    >
      <label className={`text-sm ${t.muted}`} htmlFor={`catalog-goto-${centered ? 'center' : 'side'}`}>
        Page
      </label>
      <input
        id={`catalog-goto-${centered ? 'center' : 'side'}`}
        inputMode="numeric"
        pattern="[0-9]*"
        className="input w-20 text-sm"
        value={gotoValue}
        onChange={(e) => setGotoValue(e.target.value)}
        aria-label="Go to page number"
      />
      <button type="submit" className="btn-secondary text-sm" disabled={gotoPage == null}>
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
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        className="btn-secondary text-sm"
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        Previous
      </button>
      <button
        type="button"
        className="btn-secondary text-sm"
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
      <div className="flex w-full flex-col items-center gap-3 py-3 text-center">
        <p className={`text-sm ${t.muted}`}>{statusText}</p>
        {navButtons}
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
        t.isDark ? 'border-dark-800' : 'border-gray-200'
      }`}
    >
      <p className={`text-sm ${t.muted}`}>{statusText}</p>
      {navButtons}
    </div>
  )
}

export const catalogGridClassName =
  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5'
