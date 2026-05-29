'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute requiredRole="super_admin">{children}</ProtectedRoute>
}
