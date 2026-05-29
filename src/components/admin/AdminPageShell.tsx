'use client'

import { useState } from 'react'
import AdminSidebar, { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import AdminHeaderActions from '@/components/admin/AdminHeaderActions'
import { useTheme } from '@/lib/theme'

export default function AdminPageShell({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className={`flex min-h-screen overflow-x-hidden transition-colors duration-200 ${
        isDark ? 'bg-dark-950' : 'bg-gray-50'
      }`}
    >
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 w-full lg:ml-0">
        <AppStickyHeader
          title={title}
          showSocialProof
          searchPlaceholder="Search your route..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          leading={<AdminMobileMenuButton onClick={() => setMobileOpen(true)} />}
          actions={<AdminHeaderActions />}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden app-readable">
          {description ? (
            <p className={`mb-4 sm:mb-6 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {description}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  )
}
