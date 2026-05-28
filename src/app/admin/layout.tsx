'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="admin">{children}</ProtectedRoute>
}
