'use client'

import { useMemo } from 'react'
import DashboardShell from '@/components/dashboard/DashboardShell'
import ProductForm from '@/components/admin/ProductForm'
import { sellerNavKeys } from '@/lib/seller-nav'
import { useI18n } from '@/lib/i18n-context'

export default function SellerNewProductPage() {
  const { t: tr } = useI18n()
  const nav = useMemo(
    () => sellerNavKeys.map((item) => ({ name: tr(item.key), href: item.href })),
    [tr]
  )

  return (
    <DashboardShell title={tr('seller.page.addProduct')} nav={nav}>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{tr('seller.products.hint')}</p>
      <ProductForm mode="create" portal="seller" />
    </DashboardShell>
  )
}
