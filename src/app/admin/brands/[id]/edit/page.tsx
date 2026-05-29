'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import BrandForm from '@/components/admin/BrandForm'

export default function EditBrandPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  return (
    <AdminPageShell title="Edit brand" description="Update brand details">
      <BrandForm brandId={id} />
    </AdminPageShell>
  )
}
