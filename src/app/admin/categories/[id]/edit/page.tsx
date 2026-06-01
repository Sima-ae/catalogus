'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import CategoryForm from '@/components/admin/CategoryForm'

export default function EditCategoryPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  return (
    <AdminPageShell title="Edit category">
      <CategoryForm categoryId={id} />
    </AdminPageShell>
  )
}
