'use client'

import { useMemo } from 'react'
import DashboardShell from '@/components/dashboard/DashboardShell'
import BuyerChatInbox from '@/components/buyer/BuyerChatInbox'
import { filterBuyerNavKeys } from '@/lib/buyer-nav'
import { useCatalogMode } from '@/lib/catalog-mode-context'
import { useI18n } from '@/lib/i18n-context'

export default function BuyerChatPage() {
  const { t } = useI18n()
  const { catalogMode } = useCatalogMode()
  const nav = useMemo(
    () => filterBuyerNavKeys(catalogMode).map((item) => ({ name: t(item.key), href: item.href })),
    [catalogMode, t]
  )

  return (
    <DashboardShell title={t('buyer.nav.chat')} nav={nav}>
      <BuyerChatInbox />
    </DashboardShell>
  )
}
