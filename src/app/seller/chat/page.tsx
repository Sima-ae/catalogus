'use client'

import { useMemo } from 'react'
import DashboardShell from '@/components/dashboard/DashboardShell'
import SellerChatInbox from '@/components/seller/SellerChatInbox'
import { useI18n } from '@/lib/i18n-context'
import { sellerNavKeys } from '@/lib/seller-nav'

export default function SellerChatPage() {
  const { t } = useI18n()
  const nav = useMemo(
    () => sellerNavKeys.map((item) => ({ name: t(item.key), href: item.href })),
    [t]
  )

  return (
    <DashboardShell title={t('seller.nav.chat')} nav={nav}>
      <SellerChatInbox />
    </DashboardShell>
  )
}
