'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import DashboardShell from '@/components/dashboard/DashboardShell'
import ProductForm from '@/components/admin/ProductForm'
import { sellerNavKeys } from '@/lib/seller-nav'
import { useI18n } from '@/lib/i18n-context'

export default function SellerEditProductPage() {
  const { t: tr } = useI18n()
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const nav = useMemo(
    () => sellerNavKeys.map((item) => ({ name: tr(item.key), href: item.href })),
    [tr]
  )

  return (
    <DashboardShell title={tr('seller.page.editProduct')} nav={nav}>
      <ProductForm mode="edit" productId={id} portal="seller" />
    </DashboardShell>
  )
}
