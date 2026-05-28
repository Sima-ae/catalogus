'use client'

import { useState } from 'react'
import AdminSidebar, { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

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

  return (
    <div className="flex min-h-screen bg-dark-900 overflow-x-hidden">
      <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 w-full lg:ml-0">
        <div className="flex items-center gap-2 px-4 pt-4 lg:hidden">
          <AdminMobileMenuButton onClick={() => setMobileOpen(true)} />
          <span className="text-white font-medium truncate">{title}</span>
        </div>
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
            {description && <p className="text-gray-400 mt-1 text-sm sm:text-base">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
