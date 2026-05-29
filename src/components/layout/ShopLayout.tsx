'use client'

import { ReactNode } from 'react'
import Sidebar, { SidebarMenuButton, useShopSidebar } from '@/components/layout/Sidebar'

export default function ShopLayout({
  children,
  header,
}: {
  children: ReactNode
  header?: ReactNode
}) {
  const { open: sidebarOpen, openSidebar, closeSidebar } = useShopSidebar()

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 flex flex-col min-w-0">
        {header !== undefined ? (
          header
        ) : (
          <div className="lg:hidden border-b border-dark-700 bg-dark-800 px-4 py-3">
            <SidebarMenuButton open={sidebarOpen} onOpen={openSidebar} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export { MobileMenuButton, SidebarMenuButton }
