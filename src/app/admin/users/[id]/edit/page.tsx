'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import UserForm from '@/components/admin/UserForm'

export default function EditUserPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  return (
    <AdminPageShell title="Edit user">
      <UserForm userId={id} />
    </AdminPageShell>
  )
}
