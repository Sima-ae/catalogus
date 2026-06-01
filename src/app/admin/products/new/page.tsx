'use client'

import AdminPageShell from '@/components/admin/AdminPageShell'
import ProductForm from '@/components/admin/ProductForm'

export default function NewProductPage() {
  return (
    <AdminPageShell title="Add product">
      <ProductForm mode="create" portal="admin" />
    </AdminPageShell>
  )
}
