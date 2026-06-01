'use client'

import { Suspense } from 'react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
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
    <ProtectedRoute requiredRole="buyer">
      <main className="min-h-screen p-4 sm:p-6 app-readable">
        <Suspense fallback={<PricelistFallback />}>
          <PricelistPageClient />
        </Suspense>
      </main>
    </ProtectedRoute>
  )
}
