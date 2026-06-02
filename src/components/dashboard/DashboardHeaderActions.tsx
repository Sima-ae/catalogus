'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/lib/auth-local'
import RoleBadge from '@/components/users/RoleBadge'
import ThemeToggleButton from '@/components/theme/ThemeToggleButton'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

type DashboardHeaderActionsProps = {
  children?: ReactNode
}

export default function DashboardHeaderActions({ children }: DashboardHeaderActionsProps) {
  const { user } = useAuth()

  return (
    <div className="flex flex-nowrap items-center justify-end gap-2 w-full min-w-0">
      {children}
      {user ? (
        <RoleBadge
          role={user.role}
          email={user.email}
          is_super_admin={user.is_super_admin}
          className="hidden sm:inline-flex shrink-0"
        />
      ) : null}
      <LanguageSwitcher compact />
      <ThemeToggleButton />
    </div>
  )
}
