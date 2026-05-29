'use client'

import { useState } from 'react'
import AdminSidebar, { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
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
        <div
          className={`flex items-center gap-2 px-4 pt-4 lg:hidden border-b ${
            isDark ? 'border-dark-800' : 'border-gray-200'
          }`}
        >
          <AdminMobileMenuButton onClick={() => setMobileOpen(true)} />
          <span className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{title}</span>
        </div>
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <div className="mb-4 sm:mb-6">
            <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h1>
            {description && (
              <p className={`mt-1 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {description}
              </p>
            )}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
