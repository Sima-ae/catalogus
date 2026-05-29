'use client'

import RecentPurchaseActivity from '@/components/shop/RecentPurchaseActivity'

type HeaderSocialProofProps = {
  className?: string
}

/** Site-wide activity ticker for top bars (between search/title and theme toggle). */
export default function HeaderSocialProof({ className = '' }: HeaderSocialProofProps) {
  return (
    <div className={`min-w-0 flex items-center ${className}`.trim()}>
      <RecentPurchaseActivity variant="header" />
    </div>
  )
}
