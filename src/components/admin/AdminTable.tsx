'use client'

import type { ReactNode } from 'react'
import { useAppTheme } from '@/lib/theme-classes'

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
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
}: {
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const t = useAppTheme()
  return (
    <th
      className={`py-3 px-4 font-semibold ${align === 'right' ? 'text-right' : 'text-left'} ${t.tableHead}`}
    >
      {children}
    </th>
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
