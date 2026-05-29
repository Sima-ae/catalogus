'use client'

import { useParams } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'
import ProductForm from '@/components/admin/ProductForm'
import { sellerNav } from '@/lib/seller-nav'

export default function SellerEditProductPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''

  return (
    <DashboardShell title="Edit product" nav={sellerNav}>
      <ProductForm mode="edit" productId={id} portal="seller" />
    </DashboardShell>
  )
}
