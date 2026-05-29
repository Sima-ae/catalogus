'use client'

import DashboardShell from '@/components/dashboard/DashboardShell'
import ProductForm from '@/components/admin/ProductForm'
import { sellerNav } from '@/lib/seller-nav'

export default function SellerNewProductPage() {
  return (
    <DashboardShell title="Add product" nav={sellerNav}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        New listings are published under your seller account.
      </p>
      <ProductForm mode="create" portal="seller" />
    </DashboardShell>
  )
}
