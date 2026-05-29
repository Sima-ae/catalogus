'use client'

import type { ReactNode } from 'react'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'

type DashboardHeaderActionsProps = {
  children?: ReactNode
}

export default function DashboardHeaderActions({ children }: DashboardHeaderActionsProps) {
  return (
    <div className="flex flex-nowrap items-center justify-end gap-2 w-full min-w-0">
      {children}
      <ThemeToggleButton />
    </div>
  )
}
