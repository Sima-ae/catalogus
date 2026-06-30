'use client'

import type { ReactNode } from 'react'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { useAppTheme } from '@/lib/theme-classes'

export function AdminTable({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="card overflow-x-auto">
      <table className={`w-full text-sm ${className}`.trim()}>{children}</table>
    </div>
  )
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  const t = useAppTheme()
  return (
    <thead>
      <tr className={`border-b ${t.rowBorder}`}>{children}</tr>
    </thead>
  )
}

export function AdminTh({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const t = useAppTheme()
  return (
    <th
      className={`py-3 px-4 font-semibold ${align === 'right' ? 'text-right' : 'text-left'} ${t.tableHead} ${className}`.trim()}
    >
      {children}
    </th>
  )
}

export function AdminSortableTh({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  align = 'left',
}: {
  label: string
  sortKey: string
  activeSortKey: string | null
  direction: 'asc' | 'desc'
  onSort: (key: string) => void
  align?: 'left' | 'right'
}) {
  const t = useAppTheme()
  const active = activeSortKey === sortKey
  return (
    <th
      className={`py-3 px-4 font-semibold ${align === 'right' ? 'text-right' : 'text-left'} ${t.tableHead}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded-md -mx-1 px-1 py-0.5 transition-colors ${
          active ? t.body : t.muted
        } hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60`}
        aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{label}</span>
        {active ? (
          direction === 'asc' ? (
            <ChevronUpIcon className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDownIcon className="h-4 w-4 shrink-0" aria-hidden />
          )
        ) : null}
      </button>
    </th>
  )
}

export function AdminTableFoot({ children }: { children: ReactNode }) {
  const t = useAppTheme()
  return (
    <tfoot>
      <tr className={`border-t ${t.rowBorder}`}>{children}</tr>
    </tfoot>
  )
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function AdminTr({ children }: { children: ReactNode }) {
  const t = useAppTheme()
  return <tr className={`border-b ${t.rowBorder}`}>{children}</tr>
}

export function AdminTd({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  const t = useAppTheme()
  return (
    <td
      className={`py-3 px-4 ${align === 'right' ? 'text-right' : 'text-left'} ${t.tableCell} ${className}`}
    >
      {children}
    </td>
  )
}
