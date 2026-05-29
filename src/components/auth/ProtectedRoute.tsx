'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-local'
import { getDashboardPath } from '@/lib/dashboard'
import { appPath } from '@/lib/paths'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'seller' | 'buyer' | 'super_admin'
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  requiredRole = 'admin',
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSeller, isBuyer, isSuperAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.push(appPath(redirectTo))
      return
    }

    if (!hasRoleAccess(requiredRole, { isAdmin, isSeller, isBuyer, isSuperAdmin })) {
      router.replace(appPath(user ? getDashboardPath(user.role) : redirectTo))
    }
  }, [user, loading, isAdmin, isSeller, isBuyer, isSuperAdmin, requiredRole, router, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto" />
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  if (!hasRoleAccess(requiredRole, { isAdmin, isSeller, isBuyer, isSuperAdmin })) return null

  return <>{children}</>
}

function hasRoleAccess(
  requiredRole: ProtectedRouteProps['requiredRole'],
  flags: {
    isAdmin: boolean
    isSeller: boolean
    isBuyer: boolean
    isSuperAdmin: boolean
  }
): boolean {
  switch (requiredRole) {
    case 'admin':
      return flags.isAdmin
    case 'super_admin':
      return flags.isSuperAdmin
    case 'seller':
      return flags.isSeller || flags.isAdmin
    case 'buyer':
      return flags.isBuyer || flags.isSeller || flags.isAdmin
    default:
      return true
  }
}
