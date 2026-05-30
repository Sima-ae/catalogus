'use client'

import { ReactNode } from 'react'
import Sidebar, { SidebarMenuButton, useShopSidebar } from '@/components/layout/Sidebar'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import { useTheme } from '@/lib/theme'
import ShopHeroHeaderActions from '@/components/shop/ShopHeroHeaderActions'

type ShopPageShellProps = {
  title: string
  children: ReactNode
}

export default function ShopPageShell({ title, children }: ShopPageShellProps) {
  const { theme } = useTheme()
  const {
    open: sidebarOpen,
    openSidebar,
    closeSidebar,
    dismissSidebarManually,
    asideRef,
  } = useShopSidebar()

  const shellBg = theme === 'dark' ? 'bg-dark-900' : 'bg-gray-50'

  return (
    <div className={`flex min-h-screen transition-colors duration-200 ${shellBg} overflow-x-hidden`}>
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        onManualClose={dismissSidebarManually}
        asideRef={asideRef}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <AppStickyHeader
          title={title}
          showSocialProof
          leading={<SidebarMenuButton open={sidebarOpen} onOpen={openSidebar} />}
          actions={<ShopHeroHeaderActions />}
        />

        <main className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden app-readable ${shellBg}`}>
          {children}
        </main>
      </div>
    </div>
  )
}
