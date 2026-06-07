'use client'

import AdminPageShell from '@/components/admin/AdminPageShell'
import ProductForm from '@/components/admin/ProductForm'

export default function NewProductPage() {
  return (
    <AdminPageShell titleKey="admin.page.addProduct">
      <ProductForm mode="create" portal="admin" />
    </AdminPageShell>
  )
}
