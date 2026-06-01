'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import BrandForm from '@/components/admin/BrandForm'

export default function ViewBrandPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  return (
    <AdminPageShell title="View brand">
      <BrandForm brandId={id} readOnly />
    </AdminPageShell>
  )
}
