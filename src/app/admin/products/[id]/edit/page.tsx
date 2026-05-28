'use client'

import { useParams } from 'next/navigation'
import AdminPageShell from '@/components/admin/AdminPageShell'
import ProductForm from '@/components/admin/ProductForm'

export default function EditProductPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  return (
    <AdminPageShell title="Edit product" description="Update product details">
      <ProductForm mode="edit" productId={id} />
    </AdminPageShell>
  )
}
