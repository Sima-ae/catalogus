'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import UserForm from '@/components/admin/UserForm'

export default function ViewUserPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  return (
    <AdminPageShell titleKey="admin.page.viewUser">
      <UserForm userId={id} readOnly />
    </AdminPageShell>
  )
}
