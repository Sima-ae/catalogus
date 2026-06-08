'use client'

import { useState } from 'react'
import AdminSidebar, { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import AdminHeaderActions from '@/components/admin/AdminHeaderActions'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'

export default function AdminPageShell({
  title,
  titleKey,
  children,
}: {
  /** @deprecated Prefer titleKey for i18n */
  title?: string
  titleKey?: string
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { theme } = useTheme()
  const { t: tr } = useI18n()
  const isDark = theme === 'dark'
  const resolvedTitle = titleKey ? tr(titleKey) : (title ?? '')

  return (
    <div
      className={`flex min-h-screen overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-dark-950' : 'bg-gray-50'
      }`}
    >
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 w-full lg:ml-0">
        <AppStickyHeader
          title={resolvedTitle}
          showSocialProof
          searchPlaceholder={tr('admin.searchPlaceholder')}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchClassName="max-w-[10.5rem] sm:max-w-[11rem] md:max-w-[11.5rem] lg:max-w-[12rem] xl:max-w-[12.5rem] mx-auto"
          headerGridClassName="md:grid-cols-[minmax(0,2.25fr)_minmax(0,0.62fr)_minmax(0,0.95fr)] lg:grid-cols-[minmax(0,2.4fr)_minmax(0,0.58fr)_minmax(0,0.88fr)]"
          leading={<AdminMobileMenuButton onClick={() => setMobileOpen(true)} />}
          actions={<AdminHeaderActions />}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden app-readable">{children}</main>
      </div>
    </div>
  )
}
