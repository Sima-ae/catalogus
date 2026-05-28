'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="buyer">{children}</ProtectedRoute>
}
