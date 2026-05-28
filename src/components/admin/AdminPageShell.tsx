'use client'

import AdminSidebar from '@/components/admin/AdminSidebar'
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
  return (
    <div className="flex min-h-screen bg-dark-900">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {description && <p className="text-gray-400 mt-1">{description}</p>}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
