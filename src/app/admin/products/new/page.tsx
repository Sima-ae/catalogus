'use client'

import AdminPageShell from '@/components/admin/AdminPageShell'
import ProductForm from '@/components/admin/ProductForm'

export default function NewProductPage() {
  return (
    <AdminPageShell title="Add product" description="Create a new catalog product">
      <ProductForm mode="create" />
    </AdminPageShell>
  )
}
