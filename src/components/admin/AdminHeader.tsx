'use client'

import { useState } from 'react'
import AppStickyHeader from '@/components/layout/AppStickyHeader'
import AdminHeaderActions from '@/components/admin/AdminHeaderActions'
import { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'

/** @deprecated Prefer AppStickyHeader in page shells with a dynamic title. */
export default function AdminHeader({ title = 'Admin' }: { title?: string }) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <AppStickyHeader
      title={title}
      showSocialProof
      searchPlaceholder="Search your route..."
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      leading={<AdminMobileMenuButton onClick={() => {}} />}
      actions={<AdminHeaderActions />}
    />
  )
}
