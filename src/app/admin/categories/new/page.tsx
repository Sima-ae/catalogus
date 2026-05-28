'use client'

import AdminPageShell from '@/components/admin/AdminPageShell'
import CategoryForm from '@/components/admin/CategoryForm'

export default function NewCategoryPage() {
  return (
    <AdminPageShell title="Add category" description="Create a product category">
      <CategoryForm />
    </AdminPageShell>
  )
}
