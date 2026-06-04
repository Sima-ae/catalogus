'use client'

import { Suspense } from 'react'
import PricelistAccessGate from '@/components/pricelist/PricelistAccessGate'
import PricelistPageClient from '@/components/pricelist/PricelistPageClient'

function PricelistFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
    </div>
  )
}

export default function PricelistPage() {
  return (
    <PricelistAccessGate>
      <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8 app-readable">
        <Suspense fallback={<PricelistFallback />}>
          <PricelistPageClient />
        </Suspense>
      </main>
    </PricelistAccessGate>
  )
}
