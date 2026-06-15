'use client'

import AppStickyHeader from '@/components/layout/AppStickyHeader'
import AdminHeaderActions from '@/components/admin/AdminHeaderActions'
import { AdminMobileMenuButton } from '@/components/admin/AdminSidebar'

/** @deprecated Prefer AppStickyHeader in page shells with a dynamic title. */
export default function AdminHeader({ title = 'Admin' }: { title?: string }) {
  return (
    <AppStickyHeader
      title={title}
      showSocialProof
      showSearch={false}
      leading={<AdminMobileMenuButton onClick={() => {}} />}
      actions={<AdminHeaderActions />}
    />
  )
}
