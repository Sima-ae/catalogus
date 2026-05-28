'use client'

import { useState, ReactNode } from 'react'
import Sidebar, { MobileMenuButton } from '@/components/layout/Sidebar'

export default function ShopLayout({
  children,
  header,
}: {
  children: ReactNode
  header?: ReactNode
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {header !== undefined ? (
          header
        ) : (
          <div className="lg:hidden border-b border-dark-700 bg-dark-800 px-4 py-3">
            <MobileMenuButton onClick={() => setMobileNavOpen(true)} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export { MobileMenuButton }
