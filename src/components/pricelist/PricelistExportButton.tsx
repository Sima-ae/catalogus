'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownTrayIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import type { PricelistRow } from '@/lib/pricelist-db'
import {
  buildPricelistExportRows,
  downloadPricelistPdf,
  downloadPricelistXls,
  type PricelistExportLabels,
} from '@/lib/pricelist-export'
import { useI18n } from '@/lib/i18n-context'

type Props = {
  fetchItems: () => Promise<PricelistRow[]>
  ownerLabel: string
  disabled?: boolean
  /** Icon-only button to save toolbar space */
  compact?: boolean
  className?: string
}

export default function PricelistExportButton({
  fetchItems,
  ownerLabel,
  disabled = false,
  compact = false,
  className = 'btn-secondary text-xs px-2.5 py-1',
}: Props) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<'xls' | 'pdf' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const labels: PricelistExportLabels = useMemo(
    () => ({
      title: t('pricelist.col.title'),
      sku: t('pricelist.col.sku'),
      category: t('pricelist.col.category'),
      brand: t('pricelist.col.brand'),
      price: t('pricelist.col.price'),
      image: t('pricelist.col.image'),
      sheetName: t('pricelist.export.sheetName'),
      pdfTitle: t('pricelist.export.pdfTitle', { owner: ownerLabel }),
    }),
    [t, ownerLabel]
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const runExport = useCallback(
    async (format: 'xls' | 'pdf') => {
      const items = await fetchItems()
      const rows = buildPricelistExportRows(items)
      if (!rows.length) return
      setExporting(format)
      setOpen(false)
      try {
        if (format === 'xls') {
          await downloadPricelistXls(rows, labels, ownerLabel)
        } else {
          await downloadPricelistPdf(rows, labels, ownerLabel)
        }
      } finally {
        setExporting(null)
      }
    },
    [fetchItems, labels, ownerLabel]
  )

  const busy = exporting != null

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${className} inline-flex items-center gap-1 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={t('pricelist.export.download')}
      >
        <ArrowDownTrayIcon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} shrink-0`} aria-hidden />
        {compact ? null : busy ? t('pricelist.export.exporting') : t('pricelist.export.download')}
        <ChevronDownIcon className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} shrink-0 opacity-70`} aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-dark-600 dark:bg-dark-800"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-dark-700"
            onClick={() => void runExport('xls')}
          >
            {t('pricelist.export.xls')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-dark-700"
            onClick={() => void runExport('pdf')}
          >
            {t('pricelist.export.pdf')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
