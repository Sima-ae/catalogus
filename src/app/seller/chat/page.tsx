'use client'

import { useMemo } from 'react'
import DashboardShell from '@/components/dashboard/DashboardShell'
import { useI18n } from '@/lib/i18n-context'
import { sellerNavKeys } from '@/lib/seller-nav'

export default function SellerChatPage() {
  const { t } = useI18n()
  const nav = useMemo(
    () => sellerNavKeys.map((item) => ({ name: t(item.key), href: item.href })),
    [t]
  )

  return (
    <DashboardShell title="Chat" nav={nav}>
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-sm text-gray-700">
          Seller supplier chat inbox will appear here in the next step.
        </p>
      </div>
    </DashboardShell>
  )
}

