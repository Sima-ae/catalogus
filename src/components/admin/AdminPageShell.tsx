'use client'

import { useState, type ReactNode } from 'react'
import AdminSidebar, { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import AdminHeaderActions from '@/components/admin/AdminHeaderActions'
import RecentPurchaseActivity from '@/components/shop/RecentPurchaseActivity'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/lib/i18n-context'

export default function AdminPageShell({
  title,
  titleKey,
  actions,
  children,
}: {
  /** @deprecated Prefer titleKey for i18n */
  title?: string
  titleKey?: string
  /** Primary page actions (e.g. add product) — shown on the right of the page title row */
  actions?: ReactNode
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
          title=""
          searchPlaceholder={tr('admin.searchPlaceholder')}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchClassName="w-full max-w-none md:max-w-[11rem] lg:max-w-[12rem] xl:max-w-[13rem] 2xl:max-w-[14rem]"
          headerGridClassName="md:grid-cols-[minmax(0,1fr)_10.5rem_minmax(0,auto)] lg:grid-cols-[minmax(0,1fr)_11.5rem_minmax(0,auto)] xl:grid-cols-[minmax(0,1fr)_12.5rem_minmax(0,auto)] 2xl:grid-cols-[minmax(0,1fr)_13.5rem_minmax(0,auto)]"
          leftContent={
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
              <div className="flex items-center shrink-0 lg:hidden">
                <AdminMobileMenuButton onClick={() => setMobileOpen(true)} />
              </div>
              <div className="min-w-0 flex-1">
                <RecentPurchaseActivity variant="header" />
              </div>
            </div>
          }
          actions={<AdminHeaderActions />}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden app-readable">
          {resolvedTitle || actions ? (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-6">
              {resolvedTitle ? (
                <h1
                  className={`text-xl sm:text-2xl font-semibold tracking-tight min-w-0 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {resolvedTitle}
                </h1>
              ) : (
                <span className="sr-only">Admin</span>
              )}
              {actions ? (
                <div className="flex flex-wrap items-center justify-end gap-3 ml-auto shrink-0">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}
