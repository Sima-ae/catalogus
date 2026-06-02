'use client'

import { useState } from 'react'
import AdminSidebar, { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import AdminHeaderActions from '@/components/admin/AdminHeaderActions'
import { useTheme } from '@/lib/theme'

export default function AdminPageShell({
  title,
  children,
}: {
  title: string
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
          searchClassName="max-w-[12.5rem] sm:max-w-[13.5rem] lg:max-w-[14rem] xl:max-w-[15rem] mx-auto"
          headerGridClassName="lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.25fr)]"
          leading={<AdminMobileMenuButton onClick={() => setMobileOpen(true)} />}
          actions={<AdminHeaderActions />}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden app-readable">{children}</main>
      </div>
    </div>
  )
}
