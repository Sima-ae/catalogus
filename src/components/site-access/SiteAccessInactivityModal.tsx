'use client'

import SiteAccessGateForm from '@/components/site-access/SiteAccessGateForm'

type SiteAccessInactivityModalProps = {
  onUnlock: () => void
}

export default function SiteAccessInactivityModal({ onUnlock }: SiteAccessInactivityModalProps) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-dark-900/95 backdrop-blur-sm px-4">
      <SiteAccessGateForm
        introKey="siteAccess.inactivityIntro"
        showRemember={false}
        onSuccess={onUnlock}
      />
    </div>
  )
}
