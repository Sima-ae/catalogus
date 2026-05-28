'use client'

import AdminPageShell from '@/components/admin/AdminPageShell'

export default function AdminSettingsPage() {
  return (
    <AdminPageShell title="Settings">
      <p className="text-gray-400">Store settings — configure payment, email, and site options on the VPS.</p>
    </AdminPageShell>
  )
}
